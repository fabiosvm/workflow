/**
 * Workflow endpoints.
 *
 * The signatures below are already in their final shape. Every function is
 * async and returns what the real endpoint will return, so components can be
 * written against them today. Each `TODO(api)` marks the exact line to replace
 * once the backend exists — no component code changes when that happens.
 */

import { exampleWorkflows } from '@/data/example-workflow'
import type { Workflow, WorkflowSummary } from '@/types/workflow'

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  // TODO(api): return client.get<WorkflowSummary[]>('/workflows')
  return exampleWorkflows.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }))
}

export async function getWorkflow(id: string): Promise<Workflow> {
  // TODO(api): return client.get<Workflow>(`/workflows/${id}`)
  const workflow = exampleWorkflows.find((candidate) => candidate.id === id)

  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }

  return workflow
}

export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  // TODO(api): return client.put<Workflow>(`/workflows/${workflow.id}`, workflow)
  return workflow
}
