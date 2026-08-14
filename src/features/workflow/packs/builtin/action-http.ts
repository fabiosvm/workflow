import { Globe } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'
import {
  httpMethodField,
  httpMethodSchema,
  SINGLE_OUTPUT,
} from '@/features/workflow/packs/builtin/shared'

export const httpAction: NodeDefinition = {
  type: 'action.http',
  category: 'action',
  label: 'HTTP Request',
  description: 'Calls an external HTTP endpoint',
  icon: Globe,
  hasInput: true,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    method: httpMethodSchema.default('GET'),
    url: z.string().min(1, 'URL is required').default(''),
    body: z.string().default(''),
  }),
  fields: [
    httpMethodField,
    {
      name: 'url',
      label: 'URL',
      widget: 'text',
      placeholder: 'https://api.example.com/resource',
      description: 'Supports {{ }} expressions over the incoming payload.',
    },
    {
      name: 'body',
      label: 'Body',
      widget: 'textarea',
      placeholder: '{ "id": "{{ $json.id }}" }',
    },
  ],
  appearance: {
    summary: (params) =>
      params.url ? `${params.method} ${params.url}` : undefined,
  },
}
