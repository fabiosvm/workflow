/**
 * A worked example of a third-party pack.
 *
 * It exercises every extension point at once — a category the core has never
 * heard of, a widget the core has never heard of, dynamic outputs and a
 * configuration-derived summary — using only the public contract. Nothing in
 * `registry/`, the canvas, the palette or the config panel knows this file
 * exists.
 *
 * Note what is *not* here: any React that draws a node. Node bodies belong to
 * the shell, so this pack automatically gets the misconfiguration warning and
 * whatever chrome the editor grows next. Component power lives in the widget
 * (`tag-list-widget.tsx`), which is where it belongs.
 *
 * Not registered by default. To try it:
 *
 *   createNodeRegistry([builtinPack, exampleExtensionPack])
 */

import { Bot, Split } from 'lucide-react'
import { z } from 'zod'

import {
  TagListWidget,
  type TagListConfig,
} from '@/features/workflow/packs/example-extension/tag-list-widget'
import {
  defineWidget,
  type NodeCategory,
  type NodeDefinition,
  type NodePack,
} from '@/features/workflow/registry/types'

/**
 * The widget is wrapped here rather than next to its component: `defineWidget`
 * produces a plain object, and a module exporting one alongside a component is
 * a module React Fast Refresh cannot update.
 */
const tagListWidget = defineWidget<TagListConfig>('tag-list', TagListWidget)

/** A category the core does not define, with its own accent. */
const aiCategory: NodeCategory = {
  id: 'ai',
  label: 'AI',
  order: 15,
  badge: {
    label: 'AI',
    className:
      'bg-violet-500/10 text-violet-600 border-violet-500/30 dark:text-violet-400',
  },
  accentClassName:
    'bg-violet-500/10 text-violet-600 dark:text-violet-400',
}

function parseLabels(params: Record<string, unknown>) {
  return String(params.labels ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/**
 * Outputs derive from params: one branch per configured label. The canvas reads
 * them through `resolveOutputs`, so the handles follow the configuration.
 */
const classifier: NodeDefinition = {
  type: 'ai.classifier',
  category: 'ai',
  label: 'Classifier',
  description: 'Routes the payload down a branch per predicted label',
  icon: Bot,
  hasInput: true,
  outputs: (params) => {
    const labels = parseLabels(params)

    return labels.length > 0
      ? labels.map((entry) => ({ id: entry, label: entry }))
      : [{ id: 'main' }]
  },
  paramsSchema: z.object({
    prompt: z.string().min(1, 'Prompt is required').default(''),
    labels: z.string().min(1, 'At least one label is required').default(''),
  }),
  fields: [
    {
      name: 'prompt',
      label: 'Prompt',
      widget: 'textarea',
      placeholder: 'Classify the order: {{ $json.description }}',
    },
    {
      name: 'labels',
      label: 'Labels',
      widget: 'tag-list',
      description: 'One output branch is created per label.',
      config: { suggestions: ['urgent', 'billing', 'support'] },
    },
  ],
  appearance: {
    summary: (params) => {
      const labels = parseLabels(params)
      return labels.length > 0
        ? `${labels.length} labels: ${labels.join(', ')}`
        : undefined
    },
  },
}

/** A plain node in the new category. */
const summarize: NodeDefinition = {
  type: 'ai.summarize',
  category: 'ai',
  label: 'Summarize',
  description: 'Condenses the incoming text',
  icon: Split,
  hasInput: true,
  outputs: [{ id: 'main' }],
  paramsSchema: z.object({
    maxWords: z.string().default('120'),
  }),
  fields: [{ name: 'maxWords', label: 'Max words', widget: 'text' }],
  appearance: {
    summary: (params) => `max ${params.maxWords} words`,
  },
}

export const exampleExtensionPack: NodePack = {
  id: 'example-extension',
  categories: [aiCategory],
  widgets: [tagListWidget],
  nodes: [classifier, summarize],
}
