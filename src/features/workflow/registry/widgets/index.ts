/**
 * The primitive widget vocabulary.
 *
 * These three are always registered, the way an HTML form always has text
 * inputs — they are not a privilege of the built-in node pack, which is why
 * they live here rather than inside it. Packs add richer widgets (code editor,
 * credential picker, key-value table) on top by declaring them in
 * `NodePack.widgets`.
 *
 * Each component sits in its own file and this one only assembles them.
 * `defineWidget` turns a component into a definition object, so a file that
 * both declares a widget component and exports its definition exports a
 * non-component — and React Fast Refresh gives up on the whole module. Keeping
 * the wrapping here is what lets editing a widget hot-reload.
 */

import { defineWidget, type WidgetDefinition } from '@/features/workflow/registry/types'
import {
  SelectWidget,
  type SelectWidgetConfig,
} from '@/features/workflow/registry/widgets/select-widget'
import { TextWidget } from '@/features/workflow/registry/widgets/text-widget'
import { TextareaWidget } from '@/features/workflow/registry/widgets/textarea-widget'

/** Re-exported so `builtin/shared.ts` keeps importing it from this path. */
export type { SelectWidgetConfig }

export const CORE_WIDGETS: WidgetDefinition[] = [
  defineWidget('text', TextWidget),
  defineWidget('textarea', TextareaWidget),
  defineWidget<SelectWidgetConfig>('select', SelectWidget),
]
