import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WidgetProps } from '@/features/workflow/registry/types'

export interface SelectWidgetConfig {
  options: { value: string; label: string }[]
}

export function SelectWidget({
  id,
  value,
  onChange,
  field,
  invalid,
}: WidgetProps<SelectWidgetConfig>) {
  const options = field.config?.options ?? []

  return (
    <Select value={String(value ?? '')} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={field.placeholder ?? 'Select…'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
