import { z } from 'zod'

import type { SelectWidgetConfig } from '@/features/workflow/registry/widgets'
import type {
  NodeField,
  NodeHandleDefinition,
} from '@/features/workflow/registry/types'

export const SINGLE_OUTPUT: NodeHandleDefinition[] = [{ id: 'main' }]

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

export const httpMethodSchema = z.enum(HTTP_METHODS)

export const httpMethodField: NodeField<SelectWidgetConfig> = {
  name: 'method',
  label: 'Method',
  widget: 'select',
  config: {
    options: HTTP_METHODS.map((method) => ({ value: method, label: method })),
  },
}
