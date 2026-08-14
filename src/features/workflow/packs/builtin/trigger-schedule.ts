import { Clock } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'
import { SINGLE_OUTPUT } from '@/features/workflow/packs/builtin/shared'

export const scheduleTrigger: NodeDefinition = {
  type: 'trigger.schedule',
  category: 'trigger',
  label: 'Schedule',
  description: 'Starts the workflow on a recurring schedule',
  icon: Clock,
  hasInput: false,
  outputs: SINGLE_OUTPUT,
  paramsSchema: z.object({
    cron: z.string().min(1, 'Cron expression is required').default('0 * * * *'),
    timezone: z.string().default('UTC'),
  }),
  fields: [
    {
      name: 'cron',
      label: 'Cron expression',
      widget: 'text',
      placeholder: '0 * * * *',
      description: 'Standard five-field cron syntax.',
    },
    {
      name: 'timezone',
      label: 'Timezone',
      widget: 'text',
      placeholder: 'UTC',
    },
  ],
  appearance: {
    summary: (params) =>
      params.cron ? `${params.cron} (${params.timezone ?? 'UTC'})` : undefined,
  },
}
