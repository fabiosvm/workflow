import { ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLibraryStore } from '@/features/workflow/library'
import type { WidgetProps } from '@/features/workflow/registry/types'

/**
 * Picks a workflow from the library — including the one being edited.
 *
 * A pack widget rather than a core one: `CORE_WIDGETS` is the primitive
 * vocabulary — text, textarea, select — and "a workflow" is a concept of this
 * application, not of the widget system.
 *
 * The list comes from the library store rather than from `listWorkflows()`.
 * Both read the same data, but the store already holds it, synchronously and
 * in the order the sidebar shows, so nothing here needs a loading state.
 *
 * Only the component lives here — the pack wraps it with `defineWidget` in its
 * own module, so this file stays hot-reloadable.
 */
export function WorkflowSelectWidget({
  id,
  value,
  onChange,
  field,
  invalid,
}: WidgetProps) {
  const workflows = useLibraryStore((state) => state.workflows)
  const activeId = useLibraryStore((state) => state.activeId)
  const select = useLibraryStore((state) => state.select)

  const selected = String(value ?? '')

  const isMissing = selected !== '' && !workflows.some((w) => w.id === selected)

  // Defensive: the config panel only renders with a workflow open, so the list
  // holds at least that one. A dangling reference still renders the select
  // below, so the notice explaining it has somewhere to go.
  if (workflows.length === 0 && !isMissing) {
    return (
      <p className="text-muted-foreground text-sm">
        No workflows in the library yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Select value={isMissing ? '' : selected} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
            <SelectValue placeholder={field.placeholder ?? 'Select a workflow…'} />
          </SelectTrigger>
          <SelectContent>
            {/*
             * The open workflow is offered like any other: pointing a workflow
             * at itself is recursion, a construct here rather than a mistake.
             * Marking it keeps that a decision instead of an accident.
             */}
            {workflows.map((workflow) => (
              <SelectItem key={workflow.id} value={workflow.id}>
                {workflow.id === activeId
                  ? `${workflow.name} (this workflow)`
                  : workflow.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open the selected workflow"
          // Nowhere to go when the selection is the workflow already open —
          // `select` returns early on it, so the button would do nothing.
          disabled={selected === '' || isMissing || selected === activeId}
          onClick={() => select(selected)}
        >
          <ExternalLink />
        </Button>
      </div>

      {/*
       * The stale id is kept, not cleared: a workflow may come back — restored
       * from a backup, or recreated with the same id — and silently dropping
       * the reference would destroy the configuration on the next save.
       */}
      {isMissing && (
        <p className="text-destructive text-sm">
          This workflow no longer exists ({selected}).
        </p>
      )}
    </div>
  )
}
