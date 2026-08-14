import type { NodeCategory } from '@/features/workflow/registry/types'

export const builtinCategories: NodeCategory[] = [
  {
    id: 'trigger',
    label: 'Triggers',
    order: 10,
    badge: {
      label: 'Trigger',
      className: 'bg-primary text-primary-foreground border-transparent',
    },
  },
  {
    id: 'action',
    label: 'Actions',
    order: 20,
    badge: {
      label: 'Action',
      className: 'bg-secondary text-secondary-foreground border-transparent',
    },
  },
  {
    id: 'condition',
    label: 'Logic',
    order: 30,
    badge: {
      label: 'Logic',
      className: 'bg-muted text-muted-foreground border-border',
    },
  },
]
