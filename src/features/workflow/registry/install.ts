/**
 * The active registry.
 *
 * Held as a module-level instance rather than in React context because the
 * Zustand store reads it too (`addNode` needs a node's default params) and runs
 * outside React. Keeping both readers on one instance avoids two sources of
 * truth; tests swap it by calling `installNodeRegistry` with a fixture pack.
 */

import type { NodeRegistry } from '@/features/workflow/registry/types'

let installed: NodeRegistry | null = null

export function installNodeRegistry(registry: NodeRegistry) {
  installed = registry
}

export function getNodeRegistry(): NodeRegistry {
  if (!installed) {
    throw new Error(
      '[node-registry] no registry installed — call installNodeRegistry(createNodeRegistry([…])) during bootstrap',
    )
  }

  return installed
}
