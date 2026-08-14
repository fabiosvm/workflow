import { Input } from '@/components/ui/input'
import type { WidgetProps } from '@/features/workflow/registry/types'

export function TextWidget({ id, value, onChange, onBlur, field, invalid }: WidgetProps) {
  return (
    <Input
      id={id}
      value={String(value ?? '')}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      aria-invalid={invalid}
    />
  )
}
