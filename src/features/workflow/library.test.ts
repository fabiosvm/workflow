/**
 * The library's job is to decide *when* an action may run, not to move data
 * around — the API layer does that, and it is exercised for real here rather
 * than mocked, over a repository installed on a fresh memory storage.
 *
 * The guards are what these tests pin down. Every one of them protects work the
 * user cannot get back: switching documents throws away the open one's history
 * along with its unsaved edits, and deleting throws away the document. Neither
 * has a visible symptom when the guard regresses — it just silently succeeds.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  createMemoryStorage,
  createWorkflowRepository,
  installWorkflowRepository,
} from '@/data/workflow-repository'
import { useLibraryStore } from '@/features/workflow/library'
import { useWorkflowStore } from '@/features/workflow/store'
import { installTestRegistry } from '@/features/workflow/test-support'
import type { Workflow } from '@/types/workflow'

const library = () => useLibraryStore.getState()
const editor = () => useWorkflowStore.getState()

const seed: Workflow[] = [
  { id: 'wf_a', name: 'A', nodes: [], connections: [] },
  { id: 'wf_b', name: 'B', nodes: [], connections: [] },
  { id: 'wf_c', name: 'C', nodes: [], connections: [] },
]

const ids = () => library().workflows.map((workflow) => workflow.id)

/** Any edit will do; this is the cheapest one that does not need a graph. */
function dirtyTheEditor() {
  editor().updateWorkflowMeta({ name: 'Edited but not saved' })
}

beforeEach(async () => {
  installTestRegistry()
  installWorkflowRepository(
    createWorkflowRepository(createMemoryStorage(), seed),
  )

  useLibraryStore.setState({
    workflows: [],
    activeId: null,
    isLoading: true,
    pendingAction: null,
  })
  editor().closeWorkflow()

  await library().load()
})

describe('load', () => {
  it('lists the library and opens the first workflow', () => {
    expect(ids()).toEqual(['wf_a', 'wf_b', 'wf_c'])
    expect(library().activeId).toBe('wf_a')
    expect(editor().workflow?.id).toBe('wf_a')
    expect(library().isLoading).toBe(false)
  })

  it('leaves the editor closed when there is nothing to open', async () => {
    installWorkflowRepository(createWorkflowRepository(createMemoryStorage(), []))
    await library().load()

    expect(ids()).toEqual([])
    expect(library().activeId).toBeNull()
    expect(editor().workflow).toBeNull()
  })
})

describe('create and duplicate', () => {
  it('appends the new workflow and opens it', async () => {
    await library().create()

    const created = library().workflows.at(-1)
    expect(library().workflows).toHaveLength(4)
    expect(library().activeId).toBe(created?.id)
    expect(editor().workflow?.nodes).toEqual([])
    // Opening resets the editor, so a brand new workflow is not born dirty.
    expect(editor().isDirty).toBe(false)
  })

  it('copies under a new id and opens the copy', async () => {
    await library().duplicate('wf_b')

    const copy = library().workflows.at(-1)
    expect(copy?.id).not.toBe('wf_b')
    expect(copy?.name).toBe('B (copy)')
    expect(library().activeId).toBe(copy?.id)
  })
})

describe('select', () => {
  it('switches when nothing is unsaved', async () => {
    await library().select('wf_b')

    expect(library().activeId).toBe('wf_b')
    expect(library().pendingAction).toBeNull()
  })

  it('holds the switch back while the open workflow is dirty', async () => {
    dirtyTheEditor()
    await library().select('wf_b')

    expect(library().activeId).toBe('wf_a')
    expect(editor().workflow?.id).toBe('wf_a')
    expect(library().pendingAction).toEqual({ kind: 'select', id: 'wf_b' })
  })

  it('completes the held switch on confirmation', async () => {
    dirtyTheEditor()
    await library().select('wf_b')
    await library().confirmPending()

    expect(library().activeId).toBe('wf_b')
    expect(editor().isDirty).toBe(false)
    expect(library().pendingAction).toBeNull()
  })

  it('keeps the edits when the switch is cancelled', async () => {
    dirtyTheEditor()
    await library().select('wf_b')
    library().cancelPending()

    expect(library().activeId).toBe('wf_a')
    expect(editor().isDirty).toBe(true)
    expect(library().pendingAction).toBeNull()
  })

  it('does not ask when the workflow is already open', async () => {
    dirtyTheEditor()
    await library().select('wf_a')

    expect(library().pendingAction).toBeNull()
    expect(editor().isDirty).toBe(true)
  })
})

describe('remove', () => {
  it('always asks, even with nothing unsaved', async () => {
    await library().remove('wf_b')

    expect(ids()).toEqual(['wf_a', 'wf_b', 'wf_c'])
    expect(library().pendingAction).toEqual({ kind: 'delete', id: 'wf_b' })
  })

  it('drops the workflow without disturbing the open one', async () => {
    await library().remove('wf_b')
    await library().confirmPending()

    expect(ids()).toEqual(['wf_a', 'wf_c'])
    expect(library().activeId).toBe('wf_a')
    expect(editor().workflow?.id).toBe('wf_a')
  })

  it('opens the neighbour when the open workflow goes', async () => {
    await library().select('wf_b')
    await library().remove('wf_b')
    await library().confirmPending()

    expect(ids()).toEqual(['wf_a', 'wf_c'])
    expect(library().activeId).toBe('wf_c')
    expect(editor().workflow?.id).toBe('wf_c')
  })

  it('falls back to the previous entry when the last one goes', async () => {
    await library().select('wf_c')
    await library().remove('wf_c')
    await library().confirmPending()

    expect(library().activeId).toBe('wf_b')
  })

  it('closes the editor when the library empties', async () => {
    for (const id of ['wf_a', 'wf_b', 'wf_c']) {
      await library().remove(id)
      await library().confirmPending()
    }

    expect(ids()).toEqual([])
    expect(library().activeId).toBeNull()
    expect(editor().workflow).toBeNull()
  })
})

describe('summaries', () => {
  it('picks up a rename once it is saved, not while it is typed', async () => {
    editor().updateWorkflowMeta({ name: 'Renamed' })
    expect(library().workflows[0].name).toBe('A')

    await editor().save()

    expect(library().workflows[0].name).toBe('Renamed')
    // And it is the saved copy that survives a reload.
    await library().load()
    expect(library().workflows[0].name).toBe('Renamed')
  })

  it('does not resurrect an entry that was deleted', async () => {
    const saved = editor().workflow!

    await library().remove('wf_a')
    await library().confirmPending()
    library().syncSummary(saved)

    expect(ids()).toEqual(['wf_b', 'wf_c'])
  })
})
