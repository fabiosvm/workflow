/**
 * Editor state and undo history.
 *
 * The canvas, the toolbar, the palette and the config panel all act on this
 * store rather than on local component state, so that a node dropped from the
 * sidebar, a dragged node and the save button are all looking at the same
 * graph.
 *
 * The store holds React Flow's runtime shape because that is what the canvas
 * needs on every frame; the canonical `Workflow` is reconstructed on save via
 * `toWorkflow`.
 */

import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { create } from 'zustand'

import { saveWorkflow } from '@/api/workflows'
import {
  EDGE_DEFAULTS,
  toFlowEdges,
  toFlowNodes,
  toWorkflow,
  type WorkflowNodeData,
  type WorkflowFlowNode,
} from '@/features/workflow/adapters'
import { getNodeRegistry } from '@/features/workflow/registry/install'
import {
  canConnect,
  validateGraph,
  type GraphValidation,
  EMPTY_VALIDATION,
} from '@/features/workflow/validation'
import type { Position, Workflow } from '@/types/workflow'

/**
 * Selection and measurement changes are emitted constantly while interacting
 * with the canvas and carry no persistable information.
 */
const TRANSIENT_CHANGES = new Set(['select', 'dimensions'])

function isPersistable(change: { type: string }) {
  return !TRANSIENT_CHANGES.has(change.type)
}

function isRemoval(change: { type: string }) {
  return change.type === 'remove'
}

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

interface Snapshot {
  nodes: WorkflowFlowNode[]
  edges: Edge[]
}

const HISTORY_LIMIT = 50

/**
 * Consecutive edits sharing a tag within this window collapse into a single
 * history entry, so typing a value is one undo rather than one per keystroke.
 */
const COALESCE_WINDOW_MS = 700

let lastCommitTag: string | null = null
let lastCommitAt = 0

/**
 * Deleting a node makes React Flow's `deleteElements` fire the edge handler and
 * then the node handler, synchronously, in the same tick. Both want a
 * checkpoint, but only the first one is the state worth returning to — without
 * this guard the first undo would restore the edges and leave the node gone.
 *
 * Scoped to a tick rather than to a time window on purpose: two deliberate
 * deletions in quick succession must still be two undo steps.
 */
let commitPending = false

function commitOncePerTick(commit: () => void) {
  if (commitPending) {
    return
  }

  commitPending = true
  queueMicrotask(() => {
    commitPending = false
  })

  commit()
}

interface WorkflowState {
  /** The workflow as last loaded or saved; the baseline for `toWorkflow`. */
  workflow: Workflow | null
  nodes: WorkflowFlowNode[]
  edges: Edge[]
  isDirty: boolean
  isSaving: boolean
  /**
   * Recomputed only on structural mutations. Dragging replaces the `nodes`
   * array every frame but never changes topology, so it is deliberately not a
   * trigger for revalidation.
   */
  validation: GraphValidation
  past: Snapshot[]
  future: Snapshot[]
  /**
   * Bumped on undo/redo. The config panel keys its form off this so an
   * externally replaced graph rebuilds the inputs instead of showing stale
   * values it captured on mount.
   */
  revision: number

  loadWorkflow: (workflow: Workflow) => void
  onNodesChange: (changes: NodeChange<WorkflowFlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: Position) => void
  updateNodeData: (id: string, patch: Partial<WorkflowNodeData>) => void
  /**
   * Checkpoints the current graph. Call it *before* mutating. Passing a tag
   * opts into coalescing; omitting it always creates an entry.
   */
  commit: (tag?: string) => void
  undo: () => void
  redo: () => void
  /** Called by every mutation that can change graph topology. */
  revalidate: () => void
  save: () => Promise<void>
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflow: null,
  nodes: [],
  edges: [],
  isDirty: false,
  isSaving: false,
  validation: EMPTY_VALIDATION,
  past: [],
  future: [],
  revision: 0,

  revalidate: () =>
    set((state) => ({ validation: validateGraph(state.nodes, state.edges) })),

  loadWorkflow: (workflow) => {
    lastCommitTag = null
    set({
      workflow,
      nodes: toFlowNodes(workflow),
      edges: toFlowEdges(workflow),
      isDirty: false,
      past: [],
      future: [],
    })
    get().revalidate()
  },

  commit: (tag) => {
    const now = Date.now()

    if (tag && tag === lastCommitTag && now - lastCommitAt < COALESCE_WINDOW_MS) {
      lastCommitAt = now
      return
    }

    lastCommitTag = tag ?? null
    lastCommitAt = now

    set((state) => ({
      past: [...state.past, { nodes: state.nodes, edges: state.edges }].slice(
        -HISTORY_LIMIT,
      ),
      // Any new edit invalidates the redo branch.
      future: [],
    }))
  },

  undo: () => {
    const { past, nodes, edges, future, revision } = get()
    const previous = past.at(-1)

    if (!previous) {
      return
    }

    lastCommitTag = null
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [{ nodes, edges }, ...future],
      isDirty: true,
      revision: revision + 1,
    })
    get().revalidate()
  },

  redo: () => {
    const { past, nodes, edges, future, revision } = get()
    const next = future[0]

    if (!next) {
      return
    }

    lastCommitTag = null
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }],
      future: future.slice(1),
      isDirty: true,
      revision: revision + 1,
    })
    get().revalidate()
  },

  onNodesChange: (changes) => {
    // Moves are checkpointed by the canvas on drag start, so one gesture is one
    // undo; removals have no such hook and are checkpointed here.
    const removed = changes.some(isRemoval)

    if (removed) {
      commitOncePerTick(get().commit)
    }

    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      isDirty: state.isDirty || changes.some(isPersistable),
    }))

    if (removed) {
      get().revalidate()
    }
  },

  onEdgesChange: (changes) => {
    const removed = changes.some(isRemoval)

    if (removed) {
      commitOncePerTick(get().commit)
    }

    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: state.isDirty || changes.some(isPersistable),
    }))

    if (removed) {
      get().revalidate()
    }
  },

  onConnect: (connection) => {
    // `isValidConnection` on the canvas is only feedback while dragging; this
    // is the invariant, and it also covers programmatic connections.
    if (!canConnect(connection, get().edges)) {
      return
    }

    get().commit()

    set((state) => ({
      edges: addEdge(
        { ...connection, id: createId('edge'), ...EDGE_DEFAULTS },
        state.edges,
      ),
      isDirty: true,
    }))

    get().revalidate()
  },

  addNode: (type, position) => {
    const registry = getNodeRegistry()

    if (!registry.hasNode(type)) {
      return
    }

    const definition = registry.getNode(type)
    get().commit()

    const node: WorkflowFlowNode = {
      id: createId('node'),
      type: 'workflow',
      position,
      selected: true,
      data: {
        label: definition.label,
        type: definition.type,
        params: registry.createDefaultParams(definition),
      },
    }

    set((state) => ({
      // Deselect the rest so the new node is the single active selection.
      nodes: [
        ...state.nodes.map((current) => ({ ...current, selected: false })),
        node,
      ],
      isDirty: true,
    }))

    get().revalidate()
  },

  updateNodeData: (id, patch) => {
    get().commit(`edit:${id}:${Object.keys(patch).join(',')}`)

    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      ),
      isDirty: true,
    }))
  },

  save: async () => {
    const { workflow, nodes, edges, isSaving } = get()

    if (!workflow || isSaving) {
      return
    }

    set({ isSaving: true })

    try {
      const saved = await saveWorkflow(toWorkflow(workflow, nodes, edges))
      set({ workflow: saved, isDirty: false })
    } finally {
      set({ isSaving: false })
    }
  },
}))
