import { useState } from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { WidgetProps } from '@/features/workflow/registry/types'

export interface TagListConfig {
  /** Suggestions offered below the input. */
  suggestions?: string[]
}

/**
 * A field type the core knows nothing about. Stores a comma-separated string so
 * the value stays a plain `z.string()` in the node's schema.
 *
 * Only the component lives here — the pack wraps it with `defineWidget` in its
 * own module, so this file stays hot-reloadable.
 */
export function TagListWidget({
  id,
  value,
  onChange,
  onBlur,
  field,
}: WidgetProps<TagListConfig>) {
  const [draft, setDraft] = useState('')
  const tags = String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const commit = (next: string[]) => onChange(next.join(', '))

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={draft}
        placeholder={field.placeholder ?? 'Type and press Enter'}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || !draft.trim()) {
            return
          }
          event.preventDefault()
          commit([...tags, draft.trim()])
          setDraft('')
        }}
      />
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, index) => (
            <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                className="cursor-pointer"
                onClick={() => commit(tags.filter((_, i) => i !== index))}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {field.config?.suggestions && tags.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Try: {field.config.suggestions.join(', ')}
        </p>
      )}
    </div>
  )
}
