import { Mail } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'
import { SINGLE_OUTPUT } from '@/features/workflow/packs/builtin/shared'

export const emailAction: NodeDefinition = {
  type: 'action.email',
  category: 'action',
  label: 'Send Email',
  description: 'Sends an email to one or more recipients',
  icon: Mail,
  hasInput: true,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    to: z.string().min(1, 'Recipient is required').default(''),
    subject: z.string().min(1, 'Subject is required').default(''),
    body: z.string().default(''),
  }),
  fields: [
    {
      name: 'to',
      label: 'To',
      widget: 'text',
      placeholder: 'team@example.com',
      description: 'Comma-separated for multiple recipients.',
    },
    { name: 'subject', label: 'Subject', widget: 'text' },
    { name: 'body', label: 'Body', widget: 'textarea' },
  ],
  appearance: {
    summary: (params) => (params.to ? `to ${params.to}` : undefined),
  },
}
