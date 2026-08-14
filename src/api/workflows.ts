/**
 * Workflow endpoints.
 *
 * The signatures below are already in their final shape. Every function is
 * async and returns what the real endpoint will return, so components can be
 * written against them today. Each `TODO(api)` marks the exact line to replace
 * once the backend exists — no component code changes when that happens.
 *
 * The id generation and the copy naming live here rather than in the
 * repository because they are the server's job in the finished system: when
 * these become HTTP calls, that logic leaves the client with them.
 */

import { getWorkflowRepository } from '@/data/workflow-repository'
import type { Workflow, WorkflowSummary } from '@/types/workflow'

const DEFAULT_WORKFLOW_NAME = 'Untitled workflow'

function toSummary({ id, name, description }: Workflow): WorkflowSummary {
  return { id, name, description }
}

function createWorkflowId() {
  return `wf_${crypto.randomUUID().slice(0, 8)}`
}

export async function listWorkflows(): Promise<WorkflowSummary[]> {
  // TODO(api): return client.get<WorkflowSummary[]>('/workflows')
  return getWorkflowRepository().readAll().map(toSummary)
}

export async function getWorkflow(id: string): Promise<Workflow> {
  // TODO(api): return client.get<Workflow>(`/workflows/${id}`)
  const workflow = getWorkflowRepository().readOne(id)

  if (!workflow) {
    throw new Error(`Workflow not found: ${id}`)
  }

  return workflow
}

export async function createWorkflow(
  name: string = DEFAULT_WORKFLOW_NAME,
): Promise<Workflow> {
  // TODO(api): return client.post<Workflow>('/workflows', { name })
  return getWorkflowRepository().upsert({
    id: createWorkflowId(),
    name,
    nodes: [],
    connections: [],
  })
}

/**
 * Node and connection ids are scoped to their workflow, so the graph is copied
 * as it stands — only the workflow's own identity is new.
 */
export async function duplicateWorkflow(id: string): Promise<Workflow> {
  // TODO(api): return client.post<Workflow>(`/workflows/${id}/duplicate`, {})
  const source = await getWorkflow(id)

  return getWorkflowRepository().upsert({
    ...source,
    id: createWorkflowId(),
    name: `${source.name} (copy)`,
  })
}

export async function saveWorkflow(workflow: Workflow): Promise<Workflow> {
  // TODO(api): return client.put<Workflow>(`/workflows/${workflow.id}`, workflow)
  return getWorkflowRepository().upsert(workflow)
}

export async function deleteWorkflow(id: string): Promise<void> {
  // TODO(api): await client.delete<void>(`/workflows/${id}`)
  getWorkflowRepository().remove(id)
}
