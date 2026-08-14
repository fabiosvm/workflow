/**
 * The one node whose configuration points outside its own workflow.
 *
 * What is worth pinning down is the split: the schema says a workflow must be
 * chosen, and `validate` says the chosen one must still be there. Neither can
 * do the other's job, and a reference that quietly stops being checked is
 * exactly the kind of thing nobody notices until a run fails.
 */

import { beforeEach, describe, expect, it } from 'vitest'

import { useLibraryStore } from '@/features/workflow/library'
import { executeWorkflowAction } from '@/features/workflow/packs/builtin/action-execute-workflow'
import { builtinPack } from '@/features/workflow/packs/builtin'
import { createNodeRegistry } from '@/features/workflow/registry/create'
import type { NodeRegistry } from '@/features/workflow/registry/types'

let registry: NodeRegistry

beforeEach(() => {
  registry = createNodeRegistry([builtinPack])
  useLibraryStore.setState({
    workflows: [
      { id: 'wf_open', name: 'Open one' },
      { id: 'wf_other', name: 'Order notifications' },
    ],
    activeId: 'wf_open',
  })
})

const params = (overrides: Record<string, unknown> = {}) => ({
  ...registry.createDefaultParams(executeWorkflowAction),
  ...overrides,
})

describe('params', () => {
  it('starts synchronous, with nothing chosen', () => {
    expect(params()).toEqual({ workflowId: '', input: '', mode: 'sync' })
  })

  it('requires a workflow, through the schema', () => {
    expect(registry.getNodeIssues(executeWorkflowAction, params())).toEqual([
      'workflowId: Workflow is required',
    ])

    expect(
      registry.getNodeIssues(
        executeWorkflowAction,
        params({ workflowId: 'wf_other' }),
      ),
    ).toEqual([])
  })
})

describe('validate', () => {
  it('accepts a workflow that is in the library', () => {
    expect(
      executeWorkflowAction.validate?.(params({ workflowId: 'wf_other' })),
    ).toEqual([])
  })

  /** Deleting a workflow does not touch the nodes pointing at it. */
  it('reports a reference to a workflow that is gone', () => {
    const issues = executeWorkflowAction.validate?.(
      params({ workflowId: 'wf_deleted' }),
    )

    expect(issues).toHaveLength(1)
    expect(issues?.[0].level).toBe('error')
    expect(issues?.[0].message).toMatch(/no longer exists/i)
  })

  /**
   * Deliberate, not an oversight: a workflow is a program, and a program that
   * calls itself is recursion. The graph rules take the same position on a
   * cycle inside one workflow.
   */
  it('lets a workflow execute itself', () => {
    expect(
      executeWorkflowAction.validate?.(params({ workflowId: 'wf_open' })),
    ).toEqual([])
  })

  it('leaves the empty case to the schema', () => {
    expect(executeWorkflowAction.validate?.(params())).toEqual([])
  })
})

describe('summary', () => {
  const summarise = (overrides: Record<string, unknown>) =>
    registry.getNodeSummary(executeWorkflowAction, params(overrides))

  it('names the referenced workflow', () => {
    expect(summarise({ workflowId: 'wf_other' })).toBe('Order notifications')
  })

  it('names the workflow itself when the node recurses', () => {
    expect(summarise({ workflowId: 'wf_open' })).toBe('Open one')
  })

  it('marks the asynchronous case', () => {
    expect(summarise({ workflowId: 'wf_other', mode: 'async' })).toBe(
      'Order notifications · async',
    )
  })

  it('shows the dangling id rather than an empty line', () => {
    expect(summarise({ workflowId: 'wf_deleted' })).toBe(
      'Missing workflow (wf_deleted)',
    )
  })

  it('falls back to the type label when nothing is chosen', () => {
    expect(summarise({})).toBe(executeWorkflowAction.label)
  })
})
