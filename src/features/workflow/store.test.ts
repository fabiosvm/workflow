/**
 * History is the thing worth pinning down here.
 *
 * `commitOncePerTick` and the coalescing window both exist to make undo match
 * what the user thinks of as "one edit". Neither has any visible symptom when
 * it breaks — you only find out by pressing Ctrl+Z twice and losing something.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWorkflowStore } from '@/features/workflow/store'
import {
  installTestRegistry,
  makeWorkflow,
  testTrigger,
} from '@/features/workflow/test-support'

const store = () => useWorkflowStore.getState()

/** A trigger feeding one action, so there is a node and an edge to remove. */
const fixture = () =>
  makeWorkflow([{ id: 't', type: testTrigger.type }, { id: 'a' }], ['t>a'])

beforeEach(() => {
  installTestRegistry()
  // `loadWorkflow` is also what resets the module-level coalescing tag, so it
  // has to run between tests or a tag can leak across cases.
  store().loadWorkflow(fixture())
})

afterEach(() => {
  vi.useRealTimers()
})

/** Lets the microtask behind `commitOncePerTick` run, ending the current tick. */
const nextTick = () => Promise.resolve()

describe('loadWorkflow', () => {
  it('clears history and the dirty flag', () => {
    store().onConnect({ source: 'a', target: 't', sourceHandle: null, targetHandle: null })
    expect(store().isDirty).toBe(true)

    store().loadWorkflow(fixture())

    expect(store().past).toEqual([])
    expect(store().future).toEqual([])
    expect(store().isDirty).toBe(false)
  })
})

describe('transient changes', () => {
  it('does not dirty the workflow or record history on selection', () => {
    store().onNodesChange([{ type: 'select', id: 'a', selected: true }])
    store().onEdgesChange([{ type: 'select', id: 'edge_0', selected: true }])

    expect(store().isDirty).toBe(false)
    expect(store().past).toEqual([])
    // The change still applied — it is only history that ignores it.
    expect(store().nodes.find((node) => node.id === 'a')?.selected).toBe(true)
  })
})

describe('removal', () => {
  /**
   * The case verified by hand in the browser before this suite existed:
   * `deleteElements` fires the edge handler and the node handler synchronously,
   * and the two must collapse into one undo step.
   */
  it('collapses a node and its edges into one undo step', () => {
    store().onEdgesChange([{ type: 'remove', id: 'edge_0' }])
    store().onNodesChange([{ type: 'remove', id: 'a' }])

    expect(store().past).toHaveLength(1)
    expect(store().nodes).toHaveLength(1)
    expect(store().edges).toHaveLength(0)

    store().undo()

    expect(store().nodes).toHaveLength(2)
    expect(store().edges).toHaveLength(1)
  })

  it('keeps two deliberate removals in separate ticks as two undo steps', async () => {
    store().onNodesChange([{ type: 'remove', id: 'a' }])
    await nextTick()
    store().onNodesChange([{ type: 'remove', id: 't' }])

    expect(store().past).toHaveLength(2)

    store().undo()
    expect(store().nodes).toHaveLength(1)
    store().undo()
    expect(store().nodes).toHaveLength(2)
  })

  it('revalidates after a removal', () => {
    expect(store().validation.all).toEqual([])

    store().onNodesChange([{ type: 'remove', id: 't' }])

    // The trigger is gone, so the graph now has no starting point.
    expect(store().validation.all).toHaveLength(1)
    expect(store().validation.all[0].level).toBe('error')
  })
})

describe('onConnect', () => {
  it('refuses an invalid connection without touching history', () => {
    store().onConnect({ source: 'a', target: 'a', sourceHandle: null, targetHandle: null })

    expect(store().edges).toHaveLength(1)
    expect(store().past).toEqual([])
    expect(store().isDirty).toBe(false)
  })

  it('records one history entry for an accepted connection', () => {
    store().onConnect({ source: 'a', target: 't', sourceHandle: null, targetHandle: null })

    expect(store().edges).toHaveLength(2)
    expect(store().past).toHaveLength(1)
  })
})

describe('coalescing', () => {
  it('folds edits to the same field into one history entry', () => {
    vi.useFakeTimers()

    store().updateNodeData('a', { label: 'x' })
    vi.advanceTimersByTime(100)
    store().updateNodeData('a', { label: 'xy' })
    vi.advanceTimersByTime(100)
    store().updateNodeData('a', { label: 'xyz' })

    expect(store().past).toHaveLength(1)

    store().undo()
    expect(store().nodes.find((node) => node.id === 'a')?.data.label).toBe('a')
  })

  it('starts a new entry once the window has passed', () => {
    vi.useFakeTimers()

    store().updateNodeData('a', { label: 'x' })
    vi.advanceTimersByTime(1000)
    store().updateNodeData('a', { label: 'xy' })

    expect(store().past).toHaveLength(2)
  })

  it('does not fold edits to different nodes together', () => {
    vi.useFakeTimers()

    store().updateNodeData('a', { label: 'x' })
    store().updateNodeData('t', { label: 'y' })

    expect(store().past).toHaveLength(2)
  })
})

describe('undo and redo', () => {
  it('round-trips a change', () => {
    store().onConnect({ source: 'a', target: 't', sourceHandle: null, targetHandle: null })

    store().undo()
    expect(store().edges).toHaveLength(1)

    store().redo()
    expect(store().edges).toHaveLength(2)
  })

  it('bumps the revision so the config panel rebuilds its form', () => {
    const before = store().revision

    store().onConnect({ source: 'a', target: 't', sourceHandle: null, targetHandle: null })
    store().undo()

    expect(store().revision).toBe(before + 1)
  })

  it('drops the redo branch when a new edit follows an undo', () => {
    store().onConnect({ source: 'a', target: 't', sourceHandle: null, targetHandle: null })
    store().undo()
    expect(store().future).toHaveLength(1)

    store().onNodesChange([{ type: 'remove', id: 'a' }])

    expect(store().future).toEqual([])
  })

  it('does nothing at either end of the history', () => {
    store().undo()
    store().redo()

    expect(store().nodes).toHaveLength(2)
    expect(store().edges).toHaveLength(1)
  })
})

describe('history limit', () => {
  it('keeps only the most recent entries', () => {
    vi.useFakeTimers()

    // Stepping past the coalescing window each time makes every edit its own
    // entry, which is what puts pressure on the limit.
    for (let i = 0; i < 60; i++) {
      store().updateNodeData('a', { label: `label ${i}` })
      vi.advanceTimersByTime(1000)
    }

    expect(store().past).toHaveLength(50)
  })
})
