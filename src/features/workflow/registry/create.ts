/**
 * Registry construction and validation.
 *
 * Packs are folded into one lookup here. Every rule below applies to the
 * built-in pack exactly as it applies to a third-party one — that symmetry is
 * what keeps "no difference between built-in and extension" a property of the
 * code rather than of discipline.
 *
 * Failures throw at bootstrap rather than degrading at render time: a pack
 * author gets a precise message naming their pack, not a silently mislabelled
 * node three screens away.
 */

import { CircleAlert } from 'lucide-react'
import { z } from 'zod'

import { CORE_WIDGETS } from '@/features/workflow/registry/widgets'
import type {
  NodeCategory,
  NodeDefinition,
  NodeHandleDefinition,
  NodePack,
  NodeRegistry,
  WidgetDefinition,
} from '@/features/workflow/registry/types'

const DEFAULT_ORDER = 100

/**
 * Category for types that are referenced by a workflow but not registered —
 * a pack that was removed, or a workflow authored elsewhere.
 */
const UNKNOWN_CATEGORY: NodeCategory = {
  id: '__unknown',
  label: 'Unknown',
  order: 999,
  badge: {
    label: 'Unknown',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
}

function fail(packId: string, message: string): never {
  throw new Error(`[node-registry] pack "${packId}": ${message}`)
}

/**
 * Stands in for a missing type so a workflow still loads, renders visibly
 * broken, and round-trips its params untouched on save. Extensions can
 * disappear; silently dropping their nodes would destroy user data.
 */
function createUnknownNode(type: string): NodeDefinition {
  return {
    type,
    category: UNKNOWN_CATEGORY.id,
    label: type,
    description: 'This node type is not registered. Its configuration is preserved but cannot be edited.',
    icon: CircleAlert,
    hasInput: true,
    outputs: [{ id: 'main' }],
    paramsSchema: z.object({}),
    fields: [],
  }
}

export function createNodeRegistry(packs: NodePack[]): NodeRegistry {
  const categories = new Map<string, NodeCategory>([
    [UNKNOWN_CATEGORY.id, UNKNOWN_CATEGORY],
  ])
  const widgets = new Map<string, WidgetDefinition>(
    CORE_WIDGETS.map((widget) => [widget.name, widget]),
  )
  const nodes = new Map<string, NodeDefinition>()
  /** Which pack contributed what, so collisions can name both sides. */
  const owners = new Map<string, string>()

  // Categories and widgets first: nodes reference them, so they must all be
  // present before any node is validated, regardless of pack order.
  for (const pack of packs) {
    for (const category of pack.categories ?? []) {
      const existing = owners.get(`category:${category.id}`)
      if (existing) {
        fail(
          pack.id,
          `category "${category.id}" is already registered by pack "${existing}"`,
        )
      }
      categories.set(category.id, category)
      owners.set(`category:${category.id}`, pack.id)
    }

    for (const widget of pack.widgets ?? []) {
      const existing = owners.get(`widget:${widget.name}`)
      if (existing || CORE_WIDGETS.some((core) => core.name === widget.name)) {
        fail(
          pack.id,
          `widget "${widget.name}" is already registered by ${existing ? `pack "${existing}"` : 'the core widget set'}`,
        )
      }
      widgets.set(widget.name, widget)
      owners.set(`widget:${widget.name}`, pack.id)
    }
  }

  for (const pack of packs) {
    for (const node of pack.nodes) {
      const existing = owners.get(`node:${node.type}`)
      if (existing) {
        fail(
          pack.id,
          `node type "${node.type}" is already registered by pack "${existing}"`,
        )
      }

      if (!categories.has(node.category)) {
        fail(
          pack.id,
          `node "${node.type}" references unregistered category "${node.category}"`,
        )
      }

      const shape = node.paramsSchema.shape

      for (const field of node.fields) {
        if (!widgets.has(field.widget)) {
          fail(
            pack.id,
            `node "${node.type}" field "${field.name}" uses unregistered widget "${field.widget}"`,
          )
        }

        if (!(field.name in shape)) {
          fail(
            pack.id,
            `node "${node.type}" declares field "${field.name}" which is not a key of its paramsSchema`,
          )
        }
      }

      nodes.set(node.type, node)
      owners.set(`node:${node.type}`, pack.id)
    }
  }

  const sortedCategories = [...categories.values()]
    .filter((category) => category.id !== UNKNOWN_CATEGORY.id)
    .sort(
      (a, b) =>
        (a.order ?? DEFAULT_ORDER) - (b.order ?? DEFAULT_ORDER) ||
        a.label.localeCompare(b.label),
    )

  /** Unknown definitions are cached so repeated lookups keep one identity. */
  const unknownNodes = new Map<string, NodeDefinition>()

  return {
    getNode: (type) => {
      const node = nodes.get(type)
      if (node) {
        return node
      }

      let unknown = unknownNodes.get(type)
      if (!unknown) {
        unknown = createUnknownNode(type)
        unknownNodes.set(type, unknown)
      }
      return unknown
    },

    hasNode: (type) => nodes.has(type),

    listNodes: () => [...nodes.values()],

    listNodesByCategory: (categoryId) =>
      [...nodes.values()].filter((node) => node.category === categoryId),

    getCategory: (id) => categories.get(id) ?? UNKNOWN_CATEGORY,

    listCategories: () => sortedCategories,

    getWidget: (name) => widgets.get(name),

    resolveOutputs: (definition, params): NodeHandleDefinition[] =>
      typeof definition.outputs === 'function'
        ? definition.outputs(params)
        : definition.outputs,

    createDefaultParams: (definition) => {
      const parsed = definition.paramsSchema.safeParse({})
      return parsed.success ? (parsed.data as Record<string, unknown>) : {}
    },

    getNodeSummary: (definition, params) =>
      definition.appearance?.summary?.(params)?.trim() || definition.label,

    getNodeIssues: (definition, params) => {
      const parsed = definition.paramsSchema.safeParse(params)

      if (parsed.success) {
        return []
      }

      return parsed.error.issues.map((issue) => {
        const path = issue.path.join('.')
        return path ? `${path}: ${issue.message}` : issue.message
      })
    },
  }
}
