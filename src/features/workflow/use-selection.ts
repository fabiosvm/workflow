/**
 * Reading and acting on the canvas selection from outside the canvas.
 *
 * There is no selection slice in the store: React Flow emits `select` changes
 * like any other, so `applyNodeChanges` folds them straight onto the node and
 * edge objects. Selection is therefore derived, and every consumer that wants
 * it — the header, the inspector — derives it the same way through here.
 */

import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useShallow } from 'zustand/react/shallow'

import { useWorkflowStore } from '@/features/workflow/store'

export interface SelectedIds {
  nodeIds: string[]
  edgeIds: string[]
}

/**
 * Ids of everything currently selected.
 *
 * The selectors build a new array on every store update, so they are compared
 * shallowly — without that, dragging a node (which replaces the whole `nodes`
 * array every frame) would re-render every consumer, and zustand v5 would spin
 * on the fresh reference.
 */
export function useSelectedIds(): SelectedIds {
  const nodeIds = useWorkflowStore(
    useShallow((state) =>
      state.nodes.filter((node) => node.selected).map((node) => node.id),
    ),
  )
  const edgeIds = useWorkflowStore(
    useShallow((state) =>
      state.edges.filter((edge) => edge.selected).map((edge) => edge.id),
    ),
  )

  return { nodeIds, edgeIds }
}

/**
 * Removes the given elements.
 *
 * `deleteElements` rather than a store call: it resolves the edges attached to
 * a deleted node and routes everything through the same change handlers the
 * Delete key uses, so removal behaves identically whichever way it started —
 * including collapsing the node-and-its-edges cascade into one undo step.
 */
export function useDeleteElements() {
  const { deleteElements } = useReactFlow()

  return useCallback(
    ({ nodeIds = [], edgeIds = [] }: Partial<SelectedIds>) => {
      if (nodeIds.length === 0 && edgeIds.length === 0) {
        return
      }

      void deleteElements({
        nodes: nodeIds.map((id) => ({ id })),
        edges: edgeIds.map((id) => ({ id })),
      })
    },
    [deleteElements],
  )
}
