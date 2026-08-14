/**
 * Mapping between the canonical workflow schema and React Flow's runtime shape.
 *
 * Keeping this translation in one place is what allows `Workflow` to stay the
 * source of truth: persistence, undo/redo and execution work against the
 * canonical types, and only the canvas ever sees React Flow's structures.
 */

import type { Edge, Node } from '@xyflow/react'

import type { Workflow } from '@/types/workflow'

/** Payload carried by every node rendered on the canvas. */
export type WorkflowNodeData = {
  label: string
  type: string
  params: Record<string, unknown>
}

export type WorkflowFlowNode = Node<WorkflowNodeData, 'workflow'>

/**
 * Shared by every connection, however it was created — loaded from a workflow
 * or drawn by hand. `workflow` is the custom edge that owns routing and any
 * connection chrome, so routing both paths through here is what keeps every
 * connection identical.
 */
export const EDGE_DEFAULTS = { type: 'workflow', animated: true } as const

export function toFlowNodes(workflow: Workflow): WorkflowFlowNode[] {
  return workflow.nodes.map((node) => ({
    id: node.id,
    type: 'workflow',
    position: node.position,
    data: {
      label: node.label,
      type: node.type,
      params: node.params,
    },
  }))
}

export function toFlowEdges(workflow: Workflow): Edge[] {
  return workflow.connections.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    ...EDGE_DEFAULTS,
  }))
}

/** Folds canvas state back into the canonical schema, ready to be persisted. */
export function toWorkflow(
  workflow: Workflow,
  nodes: WorkflowFlowNode[],
  edges: Edge[],
): Workflow {
  return {
    ...workflow,
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.data.type,
      label: node.data.label,
      position: node.position,
      params: node.data.params,
    })),
    connections: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,
    })),
  }
}
