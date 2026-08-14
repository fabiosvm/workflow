import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/features/workflow/registry/types'

export function TextareaWidget({
  id,
  value,
  onChange,
  onBlur,
  field,
  invalid,
}: WidgetProps) {
  return (
    <Textarea
      id={id}
      value={String(value ?? '')}
      placeholder={field.placeholder}
      rows={4}
      className={cn('font-mono text-xs')}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  )
}
