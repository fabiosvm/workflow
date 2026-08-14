/**
 * Canonical workflow schema.
 *
 * This is the source of truth for a workflow and is what gets persisted and
 * sent over the wire. It is deliberately independent of React Flow's runtime
 * state: the canvas maps this shape into its own nodes/edges and back, so that
 * persistence, undo/redo and (later) execution never depend on library
 * internals.
 */

export interface Position {
  x: number
  y: number
}

export interface WorkflowNode {
  id: string
  /**
   * Registry key identifying the concrete node implementation, e.g.
   * `action.http`. Everything else about the node type — category, icon,
   * handles, param schema — is resolved from the registry, so a pack can
   * recategorize or re-skin its nodes without migrating stored workflows.
   */
  type: string
  label: string
  position: Position
  /** Node-specific configuration, validated per node type by its own schema. */
  params: Record<string, unknown>
}

export interface WorkflowConnection {
  id: string
  source: string
  target: string
  /** Output handle on the source node. Used by branching nodes (e.g. `true` / `false`). */
  sourceHandle?: string
  targetHandle?: string
}

export interface Workflow {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
}

export type WorkflowSummary = Pick<Workflow, 'id' | 'name' | 'description'>

/** The fields edited in the header rather than on the canvas. */
export type WorkflowMeta = Partial<Pick<Workflow, 'name' | 'description'>>
