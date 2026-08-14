/**
 * What matters here is the boundary with storage.
 *
 * Everything above this module works with plain objects; this is the one place
 * that serializes, and the one place that reads back something a user could
 * have edited by hand. The seeding path is covered because it is what a first
 * run and a corrupt library have in common — both must end with a usable
 * library rather than a blank screen.
 */

import { describe, expect, it } from 'vitest'

import {
  createMemoryStorage,
  createWorkflowRepository,
  STORAGE_KEY,
  type WorkflowStorage,
} from '@/data/workflow-repository'
import type { Workflow } from '@/types/workflow'

const seed: Workflow[] = [
  { id: 'wf_a', name: 'A', nodes: [], connections: [] },
  { id: 'wf_b', name: 'B', nodes: [], connections: [] },
]

/** A second repository over the same storage, standing in for a page reload. */
function reopen(storage: WorkflowStorage) {
  return createWorkflowRepository(storage, seed)
}

describe('seeding', () => {
  it('starts from the seed and writes it out', () => {
    const storage = createMemoryStorage()

    expect(reopen(storage).readAll().map((workflow) => workflow.id)).toEqual([
      'wf_a',
      'wf_b',
    ])
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('falls back to the seed when the stored library is unreadable', () => {
    const storage = createMemoryStorage()
    storage.setItem(STORAGE_KEY, '{ not json')

    expect(reopen(storage).readAll()).toHaveLength(2)
  })

  it('drops stored entries that are not workflows', () => {
    const storage = createMemoryStorage()
    storage.setItem(STORAGE_KEY, JSON.stringify([seed[0], { id: 'wf_x' }, null]))

    expect(reopen(storage).readAll().map((workflow) => workflow.id)).toEqual([
      'wf_a',
    ])
  })

  it('does not re-seed a library that was emptied on purpose', () => {
    const storage = createMemoryStorage()
    const repository = reopen(storage)

    repository.remove('wf_a')
    repository.remove('wf_b')

    expect(reopen(storage).readAll()).toEqual([])
  })
})

describe('persistence', () => {
  it('survives a reopen', () => {
    const storage = createMemoryStorage()
    reopen(storage).upsert({ ...seed[0], name: 'Renamed' })

    expect(reopen(storage).readOne('wf_a')?.name).toBe('Renamed')
  })

  it('appends new workflows in order and removes them', () => {
    const storage = createMemoryStorage()
    const repository = reopen(storage)

    repository.upsert({ id: 'wf_c', name: 'C', nodes: [], connections: [] })
    expect(repository.readAll().map((workflow) => workflow.id)).toEqual([
      'wf_a',
      'wf_b',
      'wf_c',
    ])

    repository.remove('wf_b')
    expect(reopen(storage).readAll().map((workflow) => workflow.id)).toEqual([
      'wf_a',
      'wf_c',
    ])
  })

  it('returns undefined for an unknown id', () => {
    expect(reopen(createMemoryStorage()).readOne('wf_missing')).toBeUndefined()
  })
})

describe('isolation', () => {
  /**
   * The editor store mutates the workflow it is handed. Without a copy on the
   * way in and out, an unsaved edit would show up in the library as if it had
   * been saved — and the "discard changes" path would have nothing to discard.
   */
  it('does not share references with its callers', () => {
    const repository = reopen(createMemoryStorage())
    const stored = repository.upsert({
      id: 'wf_c',
      name: 'C',
      nodes: [],
      connections: [],
    })

    stored.name = 'Mutated by the caller'
    repository.readAll()[0].name = 'Mutated through a read'

    expect(repository.readOne('wf_c')?.name).toBe('C')
    expect(repository.readOne('wf_a')?.name).toBe('A')
  })
})
