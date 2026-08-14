import { Webhook } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'
import {
  httpMethodField,
  httpMethodSchema,
  SINGLE_OUTPUT,
} from '@/features/workflow/packs/builtin/shared'

export const webhookTrigger: NodeDefinition = {
  type: 'trigger.webhook',
  category: 'trigger',
  label: 'Webhook',
  description: 'Starts the workflow on an incoming HTTP request',
  icon: Webhook,
  hasInput: false,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    method: httpMethodSchema.default('POST'),
    path: z
      .string()
      .min(1, 'Path is required')
      .startsWith('/', 'Path must start with /')
      .default('/'),
  }),
  fields: [
    httpMethodField,
    {
      name: 'path',
      label: 'Path',
      widget: 'text',
      placeholder: '/hooks/orders',
      description: 'Appended to the webhook base URL.',
    },
  ],
  appearance: {
    summary: (params) =>
      params.path ? `${params.method} ${params.path}` : undefined,
  },
}
