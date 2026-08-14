/**
 * Fixtures shared by the core tests.
 *
 * The pack below is deliberately *not* the built-in one. Two reasons: tests of
 * the graph rules must not break when someone edits the HTTP node's schema, and
 * running the suite against a pack shaped like a third-party one is what turns
 * "the built-in pack gets no special treatment" from a claim in a comment into
 * something the tests actually exercise. The built-in pack gets a single smoke
 * test of its own, in `registry/create.test.ts`.
 */

import { Circle } from 'lucide-react'
import { z } from 'zod'

import { createNodeRegistry } from '@/features/workflow/registry/create'
import { installNodeRegistry } from '@/features/workflow/registry/install'
import type {
  NodeCategory,
  NodeDefinition,
  NodePack,
} from '@/features/workflow/registry/types'
import type { Workflow, WorkflowConnection } from '@/types/workflow'

export const TEST_CATEGORY: NodeCategory = {
  id: 'test',
  label: 'Test',
  badge: { label: 'Test', className: '' },
}

/** No input, so the graph rules treat it as a starting point. */
export const testTrigger: NodeDefinition = {
  type: 'test.trigger',
  category: TEST_CATEGORY.id,
  label: 'Test trigger',
  description: 'Starts a test workflow',
  icon: Circle,
  hasInput: false,
  outputs: [{ id: 'main' }],
  paramsSchema: z.object({ path: z.string().min(1, 'Path is required').default('/x') }),
  fields: [{ name: 'path', label: 'Path', widget: 'text' }],
}

export const testAction: NodeDefinition = {
  type: 'test.action',
  category: TEST_CATEGORY.id,
  label: 'Test action',
  description: 'Does something',
  icon: Circle,
  hasInput: true,
  outputs: [{ id: 'main' }],
  paramsSchema: z.object({ value: z.string().default('') }),
  fields: [{ name: 'value', label: 'Value', widget: 'text' }],
}

/** Two outputs, so `sourceHandle` actually distinguishes connections. */
export const testBranch: NodeDefinition = {
  type: 'test.branch',
  category: TEST_CATEGORY.id,
  label: 'Test branch',
  description: 'Routes two ways',
  icon: Circle,
  hasInput: true,
  outputs: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ],
  paramsSchema: z.object({ on: z.string().default('') }),
  fields: [{ name: 'on', label: 'On', widget: 'text' }],
  appearance: { summary: (params) => (params.on ? `on ${params.on}` : undefined) },
}

export const testPack: NodePack = {
  id: 'test',
  categories: [TEST_CATEGORY],
  nodes: [testTrigger, testAction, testBranch],
}

/**
 * The registry is module-level state, so every test file has to install one
 * before touching anything that resolves a node type.
 */
export function installTestRegistry() {
  installNodeRegistry(createNodeRegistry([testPack]))
}

interface NodeSpec {
  id: string
  /** Defaults to `test.action`. */
  type?: string
  params?: Record<string, unknown>
}

/** `'a>b'`, or `'a:out>b'` to pin the source handle. */
type ConnectionSpec = string

function parseConnection(spec: ConnectionSpec, index: number): WorkflowConnection {
  const [from, target] = spec.split('>')
  const [source, sourceHandle] = from.split(':')

  return {
    id: `edge_${index}`,
    source,
    target,
    sourceHandle,
  }
}

/** Builds a canonical workflow so the tests read as graphs, not as literals. */
export function makeWorkflow(
  nodes: NodeSpec[],
  connections: ConnectionSpec[] = [],
): Workflow {
  return {
    id: 'wf_test',
    name: 'Test workflow',
    nodes: nodes.map((node, index) => ({
      id: node.id,
      type: node.type ?? testAction.type,
      label: node.id,
      position: { x: index * 100, y: 0 },
      params: node.params ?? {},
    })),
    connections: connections.map(parseConnection),
  }
}
