/**
 * The adapters are the only place a workflow changes shape, so they are the
 * only place it can silently lose something on the way to disk.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import {
  EDGE_DEFAULTS,
  toFlowEdges,
  toFlowNodes,
  toWorkflow,
} from '@/features/workflow/adapters'
import {
  installTestRegistry,
  makeWorkflow,
  testBranch,
  testTrigger,
} from '@/features/workflow/test-support'
import type { Workflow } from '@/types/workflow'

beforeEach(() => {
  installTestRegistry()
})

const roundTrip = (workflow: Workflow) =>
  toWorkflow(workflow, toFlowNodes(workflow), toFlowEdges(workflow))

describe('round trip', () => {
  it('returns a workflow equal to the one it started from', () => {
    const workflow = makeWorkflow(
      [
        { id: 't', type: testTrigger.type, params: { path: '/hook' } },
        { id: 'split', type: testBranch.type, params: { on: 'total' } },
        { id: 'left' },
        { id: 'right' },
      ],
      ['t>split', 'split:a>left', 'split:b>right'],
    )

    expect(roundTrip(workflow)).toEqual(workflow)
  })

  it('keeps an absent source handle absent rather than turning it into null', () => {
    const workflow = makeWorkflow([{ id: 't', type: testTrigger.type }, { id: 'a' }], ['t>a'])

    const connection = roundTrip(workflow).connections[0]

    expect(connection.sourceHandle).toBeUndefined()
    expect('sourceHandle' in connection).toBe(true)
  })

  it('preserves the params of a node type no pack registered', () => {
    const params = { retries: 3, headers: { 'X-Token': 'abc' }, nested: [1, 2, 3] }
    const workflow = makeWorkflow([
      { id: 't', type: testTrigger.type },
      { id: 'gone', type: 'removed.extension.node', params },
    ])

    const saved = roundTrip(workflow).nodes.find((node) => node.id === 'gone')

    expect(saved?.type).toBe('removed.extension.node')
    expect(saved?.params).toEqual(params)
  })

  it('carries the workflow identity through untouched', () => {
    const workflow = { ...makeWorkflow([{ id: 'a' }]), description: 'kept' }

    const result = roundTrip(workflow)

    expect(result.id).toBe(workflow.id)
    expect(result.name).toBe(workflow.name)
    expect(result.description).toBe('kept')
  })
})

describe('edge defaults', () => {
  it('applies to every connection loaded from a workflow', () => {
    const workflow = makeWorkflow(
      [{ id: 't', type: testTrigger.type }, { id: 'a' }, { id: 'b' }],
      ['t>a', 'a>b'],
    )

    for (const edge of toFlowEdges(workflow)) {
      expect(edge.type).toBe(EDGE_DEFAULTS.type)
      expect(edge.animated).toBe(EDGE_DEFAULTS.animated)
    }
  })

  it('is not persisted back into the canonical schema', () => {
    const workflow = makeWorkflow([{ id: 't', type: testTrigger.type }, { id: 'a' }], ['t>a'])

    // The canonical connection describes the graph, not how it is drawn.
    expect(roundTrip(workflow).connections[0]).not.toHaveProperty('type')
    expect(roundTrip(workflow).connections[0]).not.toHaveProperty('animated')
  })
})

describe('toFlowNodes', () => {
  it('moves the type and label into node data and keeps the position outside it', () => {
    const workflow = makeWorkflow([{ id: 'a', params: { value: 'v' } }])

    const [node] = toFlowNodes(workflow)

    expect(node.type).toBe('workflow')
    expect(node.data).toEqual({
      label: 'a',
      type: 'test.action',
      params: { value: 'v' },
    })
    expect(node.position).toEqual({ x: 0, y: 0 })
  })
})
