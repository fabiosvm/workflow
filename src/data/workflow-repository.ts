/**
 * The stand-in for the backend's workflow table.
 *
 * `src/api/workflows.ts` is the only module that may import this one, the same
 * rule the seed file follows. Everything above the API layer talks to workflows
 * through async endpoints and cannot tell where they are stored.
 *
 * Storage is injected rather than reached for. `localStorage` does not exist in
 * the test environment — which is `node`, deliberately, because nothing under
 * test touches the DOM — so a repository that hard-wired it could only be
 * tested by dragging jsdom in. The factory below is also what lets a test start
 * from an empty library instead of whatever the previous test left behind.
 */

import { SEED_WORKFLOWS } from '@/data/seed-workflows'
import type { Workflow } from '@/types/workflow'

export const STORAGE_KEY = 'workflow.library.v1'

/** The slice of the `Storage` interface this needs. */
export interface WorkflowStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export interface WorkflowRepository {
  readAll: () => Workflow[]
  readOne: (id: string) => Workflow | undefined
  upsert: (workflow: Workflow) => Workflow
  remove: (id: string) => void
}

export function createMemoryStorage(): WorkflowStorage {
  const entries = new Map<string, string>()

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
  }
}

/**
 * Stored JSON is untrusted: it survives across deploys, can be edited by hand
 * in devtools, and is the one input to this module that no type checker
 * covers. Anything that does not look like a workflow is dropped rather than
 * handed upward to fail somewhere less obvious.
 */
function isWorkflow(value: unknown): value is Workflow {
  const candidate = value as Partial<Workflow> | null

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.connections)
  )
}

function parse(raw: string | null): Workflow[] | null {
  if (!raw) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed.filter(isWorkflow) : null
  } catch {
    // Corrupt entry. Falling back to the seed loses nothing that was readable.
    return null
  }
}

export function createWorkflowRepository(
  storage: WorkflowStorage,
  seed: Workflow[] = SEED_WORKFLOWS,
): WorkflowRepository {
  /**
   * Insertion order is the order the sidebar shows, so the working copy is a
   * Map rather than a plain object. Loaded once and written through on every
   * mutation — reading the whole library back from JSON on each call would make
   * every `readOne` a parse.
   */
  let entries: Map<string, Workflow> | null = null

  function flush(current: Map<string, Workflow>) {
    storage.setItem(STORAGE_KEY, JSON.stringify([...current.values()]))
  }

  function load(): Map<string, Workflow> {
    if (entries) {
      return entries
    }

    const stored = parse(storage.getItem(STORAGE_KEY))
    const loaded = new Map(
      (stored ?? seed).map((workflow) => [workflow.id, workflow] as const),
    )
    entries = loaded

    // A first run and a corrupt entry both end up here; writing the seed out
    // now means the next read takes the normal path.
    if (!stored) {
      flush(loaded)
    }

    return loaded
  }

  return {
    // Cloned on the way out and on the way in: the store mutates what it is
    // given, and a shared reference would let an unsaved edit appear in the
    // library as if it had been saved.
    readAll: () => structuredClone([...load().values()]),

    readOne: (id) => {
      const workflow = load().get(id)

      return workflow && structuredClone(workflow)
    },

    upsert: (workflow) => {
      const current = load()
      const stored = structuredClone(workflow)
      current.set(stored.id, stored)
      flush(current)

      return structuredClone(stored)
    },

    remove: (id) => {
      const current = load()
      current.delete(id)
      flush(current)
    },
  }
}

/** `localStorage` throws on access in some privacy modes, not just when absent. */
function resolveStorage(): WorkflowStorage {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    // Fall through to memory.
  }

  return createMemoryStorage()
}

/**
 * The active instance, swappable like the node registry and for the same
 * reason: a test needs to start from a library it chose, not from whatever the
 * previous test left in storage.
 */
let installed = createWorkflowRepository(resolveStorage())

export function installWorkflowRepository(repository: WorkflowRepository) {
  installed = repository
}

export function getWorkflowRepository(): WorkflowRepository {
  return installed
}
