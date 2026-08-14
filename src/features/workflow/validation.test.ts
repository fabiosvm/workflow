import { beforeEach, describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'

import { toFlowEdges, toFlowNodes } from '@/features/workflow/adapters'
import {
  checkedPack,
  installTestRegistry,
  makeWorkflow,
  testBranch,
  testChecked,
  testTrigger,
} from '@/features/workflow/test-support'
import { canConnect, validateGraph } from '@/features/workflow/validation'

beforeEach(() => {
  installTestRegistry()
})

/** Runs the rules over a graph described the same way the fixtures describe it. */
function validate(
  nodes: Parameters<typeof makeWorkflow>[0],
  connections: Parameters<typeof makeWorkflow>[1] = [],
) {
  const workflow = makeWorkflow(nodes, connections)
  return validateGraph(toFlowNodes(workflow), toFlowEdges(workflow))
}

describe('canConnect', () => {
  it('rejects a node wired to itself', () => {
    expect(canConnect({ source: 'a', target: 'a', sourceHandle: null, targetHandle: null }, [])).toBe(
      false,
    )
  })

  it('rejects a connection that already exists', () => {
    const existing: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }]

    expect(
      canConnect({ source: 'a', target: 'b', sourceHandle: null, targetHandle: null }, existing),
    ).toBe(false)
  })

  /**
   * The whole reason `handleKey` includes the handles: an If node feeding the
   * same target from both branches is legitimate, not a duplicate.
   */
  it('allows the same pair through different source handles', () => {
    const existing: Edge[] = [{ id: 'e1', source: 'a', target: 'b', sourceHandle: 'a' }]

    expect(
      canConnect({ source: 'a', target: 'b', sourceHandle: 'b', targetHandle: null }, existing),
    ).toBe(true)
  })
})

describe('validateGraph', () => {
  it('reports nothing for an empty graph', () => {
    expect(validate([]).all).toEqual([])
  })

  it('reports a workflow-level error when there is no trigger', () => {
    const { all } = validate([{ id: 'a' }, { id: 'b' }], ['a>b'])

    expect(all).toHaveLength(1)
    expect(all[0].level).toBe('error')
    expect(all[0].nodeId).toBeUndefined()
    expect(all[0].message).toMatch(/no trigger/i)
  })

  it('warns about a node no trigger can reach', () => {
    const { all, byNode } = validate(
      [{ id: 't', type: testTrigger.type }, { id: 'reached' }, { id: 'orphan' }],
      ['t>reached'],
    )

    expect(all).toHaveLength(1)
    expect(all[0].level).toBe('warning')
    expect(byNode.get('orphan')).toHaveLength(1)
    expect(byNode.has('reached')).toBe(false)
  })

  /**
   * Guards the deliberate decision that a cycle is a legal construct — this is
   * the test that stops someone "fixing" the validator into rejecting loops.
   */
  it('accepts a cycle that has a way out', () => {
    const { all } = validate(
      [
        { id: 't', type: testTrigger.type },
        { id: 'loop', type: testBranch.type },
        { id: 'back' },
        { id: 'done' },
      ],
      ['t>loop', 'loop:a>back', 'back>loop', 'loop:b>done'],
    )

    expect(all).toEqual([])
  })

  it('warns on every member of a cycle with no exit', () => {
    const { all, byNode } = validate(
      [{ id: 't', type: testTrigger.type }, { id: 'x' }, { id: 'y' }],
      ['t>x', 'x>y', 'y>x'],
    )

    expect(all).toHaveLength(2)
    expect(all.every((issue) => /loop has no exit/i.test(issue.message))).toBe(true)
    expect(byNode.get('x')).toHaveLength(1)
    expect(byNode.get('y')).toHaveLength(1)
  })

  it('treats a self-referencing node as a cycle with no exit', () => {
    const { byNode } = validate([{ id: 't', type: testTrigger.type }, { id: 'x' }], ['t>x', 'x>x'])

    expect(byNode.get('x')?.[0].message).toMatch(/loop has no exit/i)
  })

  /**
   * The slot exists so a node can report what its schema cannot state — a
   * reference to something outside the graph, say.
   */
  describe('the node-level validate slot', () => {
    beforeEach(() => {
      installTestRegistry(checkedPack)
    })

    it('reports what a node says about itself, against the node', () => {
      const { all, byNode } = validate(
        [
          { id: 't', type: testTrigger.type },
          { id: 'x', type: testChecked.type, params: { ref: 'gone' } },
        ],
        ['t>x'],
      )

      expect(all).toHaveLength(1)
      expect(all[0]).toEqual({
        level: 'error',
        message: 'That thing is gone.',
        nodeId: 'x',
      })
      expect(byNode.get('x')).toHaveLength(1)
    })

    it('stays quiet when the node has nothing to report', () => {
      const { all } = validate(
        [
          { id: 't', type: testTrigger.type },
          { id: 'x', type: testChecked.type, params: { ref: 'here' } },
        ],
        ['t>x'],
      )

      expect(all).toEqual([])
    })
  })

  it('ignores connections pointing at ids that are not in the graph', () => {
    const workflow = makeWorkflow([{ id: 't', type: testTrigger.type }, { id: 'a' }], ['t>a'])
    const edges = [
      ...toFlowEdges(workflow),
      { id: 'ghost', source: 'a', target: 'does_not_exist' },
    ]

    expect(validateGraph(toFlowNodes(workflow), edges).all).toEqual([])
  })
})
