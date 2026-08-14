/**
 * The registry's contract is that a malformed pack fails loudly at bootstrap,
 * with a message naming the pack that caused it — and that an *unknown* node,
 * which is a different situation entirely, degrades gracefully instead.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { builtinPack } from '@/features/workflow/packs/builtin'
import { createNodeRegistry } from '@/features/workflow/registry/create'
import { defineWidget } from '@/features/workflow/registry/types'
import type {
  NodeCategory,
  NodeDefinition,
  NodePack,
} from '@/features/workflow/registry/types'
import { testAction, testBranch, testPack, testTrigger } from '@/features/workflow/test-support'

const otherCategory: NodeCategory = {
  id: 'other',
  label: 'Other',
  badge: { label: 'Other', className: '' },
}

/** A pack built from the fixtures with one thing swapped out. */
function packWith(overrides: Partial<NodePack>): NodePack {
  return { id: 'offender', categories: [otherCategory], nodes: [], ...overrides }
}

function nodeWith(overrides: Partial<NodeDefinition>): NodeDefinition {
  return { ...testAction, type: 'other.node', category: otherCategory.id, ...overrides }
}

describe('bootstrap rules', () => {
  it('rejects a category another pack already registered', () => {
    expect(() =>
      createNodeRegistry([testPack, packWith({ categories: [{ ...otherCategory, id: 'test' }] })]),
    ).toThrow(/pack "offender".*category "test".*already registered by pack "test"/)
  })

  it('rejects a widget another pack already registered', () => {
    const widget = defineWidget('shared', () => null)

    expect(() =>
      createNodeRegistry([
        // No categories on the first pack, or the collision it trips is that one.
        { id: 'first', widgets: [widget], nodes: [] },
        packWith({ widgets: [widget] }),
      ]),
    ).toThrow(/pack "offender".*widget "shared".*already registered by pack "first"/)
  })

  it('rejects a widget that collides with the core set', () => {
    expect(() =>
      createNodeRegistry([packWith({ widgets: [defineWidget('text', () => null)] })]),
    ).toThrow(/pack "offender".*widget "text".*the core widget set/)
  })

  it('rejects a node type another pack already registered', () => {
    expect(() =>
      createNodeRegistry([testPack, packWith({ nodes: [nodeWith({ type: testAction.type })] })]),
    ).toThrow(/pack "offender".*node type "test.action".*already registered by pack "test"/)
  })

  it('rejects a node pointing at a category nobody registered', () => {
    expect(() =>
      createNodeRegistry([packWith({ nodes: [nodeWith({ category: 'ghost' })] })]),
    ).toThrow(/pack "offender".*references unregistered category "ghost"/)
  })

  it('rejects a field using a widget nobody registered', () => {
    expect(() =>
      createNodeRegistry([
        packWith({
          nodes: [nodeWith({ fields: [{ name: 'value', label: 'Value', widget: 'ghost' }] })],
        }),
      ]),
    ).toThrow(/pack "offender".*field "value".*unregistered widget "ghost"/)
  })

  it('rejects a field that is not a key of its own paramsSchema', () => {
    expect(() =>
      createNodeRegistry([
        packWith({
          nodes: [
            nodeWith({
              paramsSchema: z.object({ value: z.string().default('') }),
              fields: [{ name: 'typo', label: 'Typo', widget: 'text' }],
            }),
          ],
        }),
      ]),
    ).toThrow(/pack "offender".*declares field "typo".*not a key of its paramsSchema/)
  })

  /** Catches a malformed built-in node, which the fixture pack cannot. */
  it('accepts the built-in pack', () => {
    expect(() => createNodeRegistry([builtinPack])).not.toThrow()
  })
})

describe('unknown node types', () => {
  const registry = createNodeRegistry([testPack])

  it('resolves to a fallback definition rather than undefined', () => {
    const definition = registry.getNode('removed.extension.node')

    expect(definition).toBeDefined()
    expect(definition.type).toBe('removed.extension.node')
    expect(registry.hasNode('removed.extension.node')).toBe(false)
  })

  it('keeps one identity per unknown type so lookups stay referentially stable', () => {
    expect(registry.getNode('ghost')).toBe(registry.getNode('ghost'))
  })

  it('falls back to the unknown category, which is hidden from the palette', () => {
    const definition = registry.getNode('ghost')

    expect(registry.getCategory(definition.category).label).toBe('Unknown')
    expect(registry.listCategories().map((category) => category.id)).not.toContain(
      definition.category,
    )
  })
})

describe('lookups', () => {
  const registry = createNodeRegistry([testPack])

  it('resolves outputs declared as a function of the params', () => {
    const dynamic = nodeWith({
      outputs: (params) =>
        Array.from({ length: Number(params.count ?? 0) }, (_, i) => ({ id: `out_${i}` })),
    })

    expect(registry.resolveOutputs(dynamic, { count: 3 })).toHaveLength(3)
    expect(registry.resolveOutputs(testBranch, {})).toEqual(testBranch.outputs)
  })

  it('derives default params from the zod schema', () => {
    expect(registry.createDefaultParams(testTrigger)).toEqual({ path: '/x' })
  })

  it('summarises a node, falling back to its type label', () => {
    expect(registry.getNodeSummary(testBranch, { on: 'total' })).toBe('on total')
    expect(registry.getNodeSummary(testBranch, {})).toBe(testBranch.label)
    expect(registry.getNodeSummary(testAction, {})).toBe(testAction.label)
  })

  it('surfaces schema violations as issues, prefixed by the field', () => {
    expect(registry.getNodeIssues(testTrigger, { path: '/ok' })).toEqual([])
    expect(registry.getNodeIssues(testTrigger, { path: '' })).toEqual([
      'path: Path is required',
    ])
  })

  it('lists categories by order and nodes by category', () => {
    expect(registry.listNodesByCategory('test')).toHaveLength(3)
    expect(registry.listNodesByCategory('nope')).toEqual([])
    expect(registry.listCategories().map((category) => category.id)).toEqual(['test'])
  })
})
