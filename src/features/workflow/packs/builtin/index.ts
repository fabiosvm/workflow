/**
 * The built-in node pack.
 *
 * Structurally identical to any third-party pack: it registers categories and
 * node definitions and gets no special treatment from the registry. Remove this
 * folder and its line in `main.tsx` and the editor still compiles and runs,
 * with an empty palette.
 */

import { defineWidget, type NodePack } from '@/features/workflow/registry/types'
import { builtinCategories } from '@/features/workflow/packs/builtin/categories'
import { emailAction } from '@/features/workflow/packs/builtin/action-email'
import { executeWorkflowAction } from '@/features/workflow/packs/builtin/action-execute-workflow'
import { httpAction } from '@/features/workflow/packs/builtin/action-http'
import { ifCondition } from '@/features/workflow/packs/builtin/condition-if'
import { scheduleTrigger } from '@/features/workflow/packs/builtin/trigger-schedule'
import { transformAction } from '@/features/workflow/packs/builtin/action-transform'
import { webhookTrigger } from '@/features/workflow/packs/builtin/trigger-webhook'
import { WorkflowSelectWidget } from '@/features/workflow/packs/builtin/workflow-select-widget'

/**
 * Wrapped here rather than next to its component: `defineWidget` produces a
 * plain object, and a module exporting one alongside a component is a module
 * React Fast Refresh cannot update.
 */
const workflowSelectWidget = defineWidget('workflow-select', WorkflowSelectWidget)

export const builtinPack: NodePack = {
  id: 'builtin',
  categories: builtinCategories,
  widgets: [workflowSelectWidget],
  nodes: [
    webhookTrigger,
    scheduleTrigger,
    httpAction,
    emailAction,
    transformAction,
    executeWorkflowAction,
    ifCondition,
  ],
}
