/**
 * The node contract.
 *
 * Everything the editor knows about a node type lives in a `NodeDefinition`,
 * and definitions arrive exclusively through packs. There is no privileged
 * path: the built-in nodes are registered by the same call a third-party pack
 * uses, and are validated by the same rules.
 *
 * The contract is open for additive extension — a future `compile` slot for
 * code generation can be added as an optional field without breaking any
 * existing pack.
 */

import type { ComponentType } from 'react'
import type { z } from 'zod'

/** A connection point. Branching nodes declare more than one output. */
export interface NodeHandleDefinition {
  /** Referenced by `WorkflowConnection.sourceHandle`. */
  id: string
  label?: string
}

/** Palette grouping and canvas badge for a family of nodes. */
export interface NodeCategory {
  id: string
  /** Heading shown in the sidebar palette. */
  label: string
  badge: { label: string; className: string }
  /**
   * Applied to the icon tile of every node in the family. Accent is a
   * family-level decision, not a per-node one.
   */
  accentClassName?: string
  /** Palette ordering; lower comes first. Defaults to 100. */
  order?: number
}

/**
 * How one param is rendered. Deliberately separate from the zod schema:
 * introspecting a schema to guess a widget is brittle (nothing in `z.string()`
 * says textarea). The schema owns validation, this owns presentation.
 */
export interface NodeField<TConfig = unknown> {
  /** Must be a key of the node's `paramsSchema`. Checked at registration. */
  name: string
  label: string
  description?: string
  placeholder?: string
  /** Name of a registered widget. Checked at registration. */
  widget: string
  /** Widget-specific options, typed by the widget that declares it. */
  config?: TConfig
}

export interface WidgetProps<TConfig = unknown> {
  id: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  field: NodeField<TConfig>
  invalid: boolean
}

export interface WidgetDefinition {
  name: string
  component: ComponentType<WidgetProps>
}

/**
 * Declares a widget while keeping its config type checked at the author's end.
 * The registry stores widgets heterogeneously, so the config type is erased
 * here — this is the single place that erasure happens.
 */
export function defineWidget<TConfig>(
  name: string,
  component: ComponentType<WidgetProps<TConfig>>,
): WidgetDefinition {
  return { name, component: component as ComponentType<WidgetProps> }
}

/**
 * How a node presents itself on the canvas.
 *
 * Deliberately declarative rather than a render slot. A pack that draws its own
 * node body freezes the shell: every piece of chrome the editor grows later —
 * the misconfiguration warning, execution state, a missing-credential hint —
 * would stop reaching it. Node bodies stay uniform (as in n8n, Zapier and
 * Retool); packs get real component power in the config panel, through the
 * widget registry.
 */
export interface NodeAppearance {
  /**
   * Secondary line under the node name, derived from its configuration —
   * n8n's `subtitle`. Falls back to the node type's label.
   */
  summary?: (params: Record<string, unknown>) => string | undefined
}

export interface NodeDefinition {
  /** Globally unique key, e.g. `slack.post`. Matches `WorkflowNode.type`. */
  type: string
  /** Id of a registered `NodeCategory`. */
  category: string
  label: string
  description: string
  /** Any component taking a className — lucide icons satisfy this. */
  icon: ComponentType<{ className?: string }>
  /** Triggers start a workflow and therefore take no input. */
  hasInput: boolean
  /**
   * A function receives the node's current params, which lets a node vary its
   * branches with its configuration (a Switch with N cases).
   */
  outputs:
    | NodeHandleDefinition[]
    | ((params: Record<string, unknown>) => NodeHandleDefinition[])
  paramsSchema: z.ZodObject
  fields: NodeField[]
  appearance?: NodeAppearance
}

/**
 * The unit of distribution. A pack may contribute node types, the categories
 * that group them and the widgets their fields need.
 */
export interface NodePack {
  /** Used in registration error messages to name the culprit. */
  id: string
  categories?: NodeCategory[]
  widgets?: WidgetDefinition[]
  nodes: NodeDefinition[]
}

export interface NodeRegistry {
  /** Never returns undefined: unregistered types resolve to a fallback. */
  getNode: (type: string) => NodeDefinition
  hasNode: (type: string) => boolean
  listNodes: () => NodeDefinition[]
  listNodesByCategory: (categoryId: string) => NodeDefinition[]
  getCategory: (id: string) => NodeCategory
  /** Sorted by `order`, then label. */
  listCategories: () => NodeCategory[]
  getWidget: (name: string) => WidgetDefinition | undefined
  resolveOutputs: (
    definition: NodeDefinition,
    params: Record<string, unknown>,
  ) => NodeHandleDefinition[]
  createDefaultParams: (definition: NodeDefinition) => Record<string, unknown>
  /** The node's secondary line; the type label when it declares no summary. */
  getNodeSummary: (
    definition: NodeDefinition,
    params: Record<string, unknown>,
  ) => string
  /**
   * Configuration problems, straight from the node's own zod schema. Because
   * the shell owns node rendering, this reaches every node — including
   * third-party ones — with no code in any pack.
   */
  getNodeIssues: (
    definition: NodeDefinition,
    params: Record<string, unknown>,
  ) => string[]
}
