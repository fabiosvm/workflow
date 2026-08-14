import { GitBranch } from 'lucide-react'
import { z } from 'zod'

import type { NodeDefinition } from '@/features/workflow/registry/types'

const OPERATORS: { value: string; label: string }[] = [
  { value: 'eq', label: 'equals' },
  { value: 'ne', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less or equal' },
  { value: 'contains', label: 'contains' },
]

/** Compact glyphs for the canvas summary, where space is tight. */
const OPERATOR_GLYPHS: Record<string, string> = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contains',
}

export const ifCondition: NodeDefinition = {
  type: 'condition.if',
  category: 'condition',
  label: 'If',
  description: 'Routes execution based on a condition',
  icon: GitBranch,
  hasInput: true,
  outputs: [
    { id: 'true', label: 'true' },
    { id: 'false', label: 'false' },
  ],
  paramsSchema: z.object({
    left: z.string().min(1, 'Left operand is required').default(''),
    operator: z
      .enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'])
      .default('eq'),
    right: z.string().default(''),
  }),
  fields: [
    {
      name: 'left',
      label: 'Left operand',
      widget: 'text',
      placeholder: '{{ $json.total }}',
    },
    {
      name: 'operator',
      label: 'Operator',
      widget: 'select',
      config: { options: OPERATORS },
    },
    {
      name: 'right',
      label: 'Right operand',
      widget: 'text',
      placeholder: '1000',
    },
  ],
  appearance: {
    summary: (params) => {
      if (!params.left) {
        return undefined
      }

      const glyph = OPERATOR_GLYPHS[String(params.operator)] ?? '='
      return `${params.left} ${glyph} ${params.right ?? ''}`.trim()
    },
  },
}
