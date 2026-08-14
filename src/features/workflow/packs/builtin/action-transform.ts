import { Braces } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'
import { SINGLE_OUTPUT } from '@/features/workflow/packs/builtin/shared'

export const transformAction: NodeDefinition = {
  type: 'action.transform',
  category: 'action',
  label: 'Transform',
  description: 'Reshapes the incoming payload',
  icon: Braces,
  hasInput: true,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    expression: z.string().min(1, 'Expression is required').default(''),
  }),
  fields: [
    {
      name: 'expression',
      label: 'Expression',
      widget: 'textarea',
      placeholder: '{ id: $json.id }',
      description: 'Evaluated against the incoming item.',
    },
  ],
  appearance: {
    summary: (params) =>
      typeof params.expression === 'string' ? params.expression : undefined,
  },
}
