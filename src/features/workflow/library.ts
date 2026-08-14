/**
 * The workflow library: which workflows exist, and which one is open.
 *
 * Separate from `store.ts` because the two have different lifetimes and
 * different owners. The editor store is the open document — its history, its
 * dirty flag, its validation — and it is replaced wholesale every time another
 * workflow is opened. This store outlives that.
 *
 * The dependency runs one way, library → editor. Nothing in the editor knows a
 * library exists; the sidebar's names stay current through a subscription at
 * the bottom of this file rather than through a call from `save`.
 */

import { create } from 'zustand'

import {
  createWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  getWorkflow,
  listWorkflows,
} from '@/api/workflows'
import { useWorkflowStore } from '@/features/workflow/store'
import type { Workflow, WorkflowSummary } from '@/types/workflow'

function toSummary({ id, name, description }: Workflow): WorkflowSummary {
  return { id, name, description }
}

/**
 * An action held back until the user answers the confirmation dialog. Deleting
 * always asks; the rest ask only when they would discard unsaved edits.
 */
export type PendingAction =
  | { kind: 'create' }
  | { kind: 'select' | 'duplicate' | 'delete'; id: string }

interface LibraryState {
  workflows: WorkflowSummary[]
  activeId: string | null
  isLoading: boolean
  pendingAction: PendingAction | null

  /** Bootstrap: list the library and open the first entry. */
  load: () => Promise<void>
  select: (id: string) => Promise<void>
  create: () => Promise<void>
  duplicate: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  /** Runs the held action, past the guard that held it. */
  confirmPending: () => Promise<void>
  cancelPending: () => void
  /** Reflects a saved workflow back into its list entry. */
  syncSummary: (workflow: Workflow) => void
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  /** Hands a workflow to the editor and marks it active. */
  function open(workflow: Workflow) {
    useWorkflowStore.getState().loadWorkflow(workflow)
    set({ activeId: workflow.id })
  }

  /**
   * The action itself, with no guard in front of it. Both the direct path and
   * the confirmed path go through here so a confirmation cannot drift from
   * what it was confirming.
   */
  async function perform(action: PendingAction) {
    switch (action.kind) {
      case 'select': {
        if (action.id !== get().activeId) {
          open(await getWorkflow(action.id))
        }

        return
      }

      case 'create': {
        const workflow = await createWorkflow()
        set((state) => ({ workflows: [...state.workflows, toSummary(workflow)] }))
        open(workflow)

        return
      }

      case 'duplicate': {
        const copy = await duplicateWorkflow(action.id)
        set((state) => ({ workflows: [...state.workflows, toSummary(copy)] }))
        open(copy)

        return
      }

      case 'delete': {
        const { id } = action
        const { workflows, activeId } = get()
        const index = workflows.findIndex((workflow) => workflow.id === id)

        await deleteWorkflow(id)

        const remaining = workflows.filter((workflow) => workflow.id !== id)
        set({ workflows: remaining })

        if (activeId !== id) {
          // The open workflow may hold a node pointing at what just went away.
          // Nothing mutated its graph, so only an explicit pass surfaces that.
          useWorkflowStore.getState().revalidate()

          return
        }

        // The neighbour that took the deleted entry's place, or the new last
        // one when it was the tail.
        const next = remaining[index] ?? remaining.at(-1)

        if (next) {
          open(await getWorkflow(next.id))
        } else {
          useWorkflowStore.getState().closeWorkflow()
          set({ activeId: null })
        }
      }
    }
  }

  /**
   * Deleting is destructive whatever the editor's state, so it always asks.
   * The others only replace what is on the canvas, which is harmless until
   * there is something unsaved on it.
   */
  function needsConfirmation(action: PendingAction) {
    if (action.kind === 'delete') {
      return true
    }

    if (action.kind === 'select' && action.id === get().activeId) {
      return false
    }

    return useWorkflowStore.getState().isDirty
  }

  async function attempt(action: PendingAction) {
    if (needsConfirmation(action)) {
      set({ pendingAction: action })

      return
    }

    await perform(action)
  }

  return {
    workflows: [],
    activeId: null,
    isLoading: true,
    pendingAction: null,

    load: async () => {
      set({ isLoading: true })

      try {
        const workflows = await listWorkflows()
        set({ workflows })

        const first = workflows[0]

        if (first) {
          open(await getWorkflow(first.id))
        } else {
          useWorkflowStore.getState().closeWorkflow()
          set({ activeId: null })
        }
      } finally {
        set({ isLoading: false })
      }
    },

    select: (id) => attempt({ kind: 'select', id }),
    create: () => attempt({ kind: 'create' }),
    duplicate: (id) => attempt({ kind: 'duplicate', id }),
    remove: (id) => attempt({ kind: 'delete', id }),

    confirmPending: async () => {
      const action = get().pendingAction

      if (!action) {
        return
      }

      set({ pendingAction: null })
      await perform(action)
    },

    cancelPending: () => set({ pendingAction: null }),

    syncSummary: (workflow) =>
      set((state) => ({
        // Map, never append: a workflow reaches the list through the action
        // that created it, and this must not resurrect a deleted entry.
        workflows: state.workflows.map((summary) =>
          summary.id === workflow.id ? toSummary(workflow) : summary,
        ),
      })),
  }
})

/**
 * Saving is the editor's, but the name it saved is the sidebar's. Listening
 * here keeps the dependency one-directional — having `save` call into this
 * store would make the two modules import each other.
 *
 * `isDirty` is what distinguishes a save from a rename in progress. Renaming
 * replaces the workflow object on every keystroke too, and pushing those into
 * the sidebar would leave it showing a name that a discard is about to throw
 * away. Only a clean workflow is a saved one.
 */
useWorkflowStore.subscribe((state, previous) => {
  if (state.workflow && state.workflow !== previous.workflow && !state.isDirty) {
    useLibraryStore.getState().syncSummary(state.workflow)
  }
})
