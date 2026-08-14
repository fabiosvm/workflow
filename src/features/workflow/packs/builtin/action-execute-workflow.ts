import { Workflow } from 'lucide-react'
import { z } from 'zod'

import { useLibraryStore } from '@/features/workflow/library'
import { SINGLE_OUTPUT } from '@/features/workflow/packs/builtin/shared'
import type { NodeDefinition } from '@/features/workflow/registry/types'
import type { SelectWidgetConfig } from '@/features/workflow/registry/widgets'

const MODES: SelectWidgetConfig['options'] = [
  { value: 'sync', label: 'Wait for it to finish' },
  { value: 'async', label: 'Continue immediately' },
]

/**
 * Reading the library from a node definition is a deliberate exception to
 * "params are all a node knows". A reference is only meaningful against the
 * set of things it can refer to, and that set lives outside the graph. It is
 * safe here because exactly one workflow is open at a time: the referenced one
 * cannot be renamed while this node is on screen, and deleting it revalidates
 * the open editor, which re-renders the node.
 */
function findWorkflow(params: Record<string, unknown>) {
  const id = String(params.workflowId ?? '')

  return id === ''
    ? undefined
    : useLibraryStore.getState().workflows.find((entry) => entry.id === id)
}

export const executeWorkflowAction: NodeDefinition = {
  type: 'action.executeWorkflow',
  category: 'action',
  label: 'Execute Workflow',
  description: 'Runs a workflow from the library, this one included',
  icon: Workflow,
  hasInput: true,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    workflowId: z.string().min(1, 'Workflow is required').default(''),
    input: z.string().default(''),
    mode: z.enum(['sync', 'async']).default('sync'),
  }),
  fields: [
    {
      name: 'workflowId',
      label: 'Workflow',
      widget: 'workflow-select',
      description: 'The workflow this node runs.',
    },
    {
      name: 'input',
      label: 'Input',
      widget: 'textarea',
      placeholder: '{ "orderId": "{{ $json.id }}" }',
      description: 'Leave empty to pass the incoming payload through unchanged.',
    },
    {
      name: 'mode',
      label: 'Mode',
      widget: 'select',
      config: { options: MODES },
    },
  ],
  /**
   * What the schema cannot see. `workflowId` being present is its job; whether
   * anything answers to that id is not something a string can state.
   *
   * A workflow naming itself here is *not* reported. A workflow is a program,
   * and a program calling itself is recursion — the same construct the graph
   * rules already permit inside one workflow ("a cycle is a legal construct,
   * not an error"), crossing the boundary between two. Whether it terminates
   * is a question about the run, which nothing here can answer.
   */
  validate: (params) => {
    const id = String(params.workflowId ?? '')

    if (id === '' || findWorkflow(params)) {
      return []
    }

    return [
      {
        level: 'error',
        message: 'The workflow this node runs no longer exists.',
      },
    ]
  },
  appearance: {
    summary: (params) => {
      const id = String(params.workflowId ?? '')

      if (id === '') {
        return undefined
      }

      const name = findWorkflow(params)?.name ?? `Missing workflow (${id})`

      return params.mode === 'async' ? `${name} · async` : name
    },
  },
}
