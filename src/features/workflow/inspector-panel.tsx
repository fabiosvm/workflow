/**
 * Inspector for whatever is selected on the canvas.
 *
 * For a node the form is generated from its registry entry: the zod schema
 * validates, the field descriptors pick the widgets, and the widgets themselves
 * come from the registry. No node type has a hand-written form and no widget is
 * hard-coded here, so a pack can ship a field type the core has never heard of.
 *
 * For a connection there is nothing to configure — an edge carries no data of
 * its own — so the panel describes what it joins, reading both endpoints back
 * through the same registry.
 *
 * The panel only describes; it does not act. Deleting lives in the header,
 * next to undo/redo, because it applies to whatever is selected — including
 * the multi-selections and the narrow viewports this panel does not cover.
 */

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, type FieldValues } from 'react-hook-form'
import { ArrowRight, Settings2, Spline, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { WorkflowFlowNode } from '@/features/workflow/adapters'
import { getNodeRegistry } from '@/features/workflow/registry/install'
import type { NodeDefinition } from '@/features/workflow/registry/types'
import { useWorkflowStore } from '@/features/workflow/store'
import { useSelectedIds } from '@/features/workflow/use-selection'

/** The panel's frame. Hidden below `lg`, where the header trash is the way. */
function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <aside className="bg-background hidden w-80 shrink-0 flex-col border-l lg:flex">
      {children}
    </aside>
  )
}

/** The header tile every entry in this panel leads with. */
function IconTile({
  icon: Icon,
  className,
}: {
  icon: NodeDefinition['icon']
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md',
        className,
      )}
    >
      <Icon className="size-4" />
    </div>
  )
}

interface NodeFormProps {
  node: WorkflowFlowNode
  definition: NodeDefinition
}

function NodeForm({ node, definition }: NodeFormProps) {
  const registry = getNodeRegistry()
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData)

  const form = useForm<FieldValues>({
    resolver: zodResolver(definition.paramsSchema),
    mode: 'onChange',
    defaultValues: {
      ...registry.createDefaultParams(definition),
      ...node.data.params,
    },
  })

  /**
   * Params are written back on every keystroke rather than on submit: the
   * canvas is the document, so there is nothing to submit to. Invalid values
   * are still stored — the error is surfaced inline instead of discarding
   * what was typed.
   */
  useEffect(() => {
    const subscription = form.watch((values) => {
      updateNodeData(node.id, { params: values as Record<string, unknown> })
    })

    return () => subscription.unsubscribe()
  }, [form, node.id, updateNodeData])

  return (
    <FieldGroup>
      {definition.fields.map((field) => {
        const widget = registry.getWidget(field.widget)

        // Unreachable for a registered pack — the registry rejects unknown
        // widgets at bootstrap — but reachable for an unknown node's leftovers.
        if (!widget) {
          return null
        }

        const Widget = widget.component
        const inputId = `${node.id}-${field.name}`

        return (
          <Controller
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: controlled, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={inputId}>{field.label}</FieldLabel>
                <Widget
                  id={inputId}
                  value={controlled.value}
                  onChange={controlled.onChange}
                  onBlur={controlled.onBlur}
                  field={field}
                  invalid={fieldState.invalid}
                />
                {field.description && (
                  <FieldDescription>{field.description}</FieldDescription>
                )}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        )
      })}
    </FieldGroup>
  )
}

/**
 * Shown when a workflow references a node type no pack registered — a removed
 * extension, or a workflow authored against a different install. The params are
 * displayed read-only and preserved on save rather than silently dropped.
 */
function UnknownNodeNotice({ params }: { params: Record<string, unknown> }) {
  return (
    <div className="space-y-3">
      <div className="border-destructive/30 bg-destructive/5 text-destructive flex gap-2 rounded-md border p-3 text-xs">
        <TriangleAlert className="mt-px size-4 shrink-0" />
        <p>
          No registered pack provides this node type. Its configuration is shown
          read-only and will be preserved when you save.
        </p>
      </div>
      <pre className="bg-muted text-muted-foreground overflow-x-auto rounded-md p-3 font-mono text-xs">
        {JSON.stringify(params, null, 2)}
      </pre>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Settings2 className="size-5" />
      <p className="text-sm">Select a node or connection</p>
      <p className="text-xs">Drag a node in from the sidebar to get started.</p>
    </div>
  )
}

function NodeInspector({ nodeId }: { nodeId: string }) {
  const registry = getNodeRegistry()
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData)

  // `find` hands back the stored object, so this selector returns the same
  // reference until the node itself changes.
  const node = useWorkflowStore(
    (state) => state.nodes.find((candidate) => candidate.id === nodeId) ?? null,
  )
  const revision = useWorkflowStore((state) => state.revision)

  if (!node) {
    return <EmptyState />
  }

  const definition = registry.getNode(node.data.type)
  const category = registry.getCategory(definition.category)
  const isKnown = registry.hasNode(node.data.type)

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <IconTile icon={definition.icon} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{definition.label}</p>
          <p className="text-muted-foreground truncate text-xs">
            {definition.description}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {category.badge.label}
        </Badge>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 p-4">
          <Field>
            <FieldLabel htmlFor={`${node.id}-label`}>Name</FieldLabel>
            <Input
              id={`${node.id}-label`}
              value={node.data.label}
              onChange={(event) =>
                updateNodeData(node.id, { label: event.target.value })
              }
            />
            <FieldDescription>Shown on the canvas.</FieldDescription>
          </Field>

          <Separator />

          {isKnown ? (
            /* Keyed by node id so switching nodes rebuilds the form state,
               and by revision so undo/redo does too. */
            <NodeForm
              key={`${node.id}:${revision}`}
              node={node}
              definition={definition}
            />
          ) : (
            <UnknownNodeNotice params={node.data.params} />
          )}
        </div>
      </ScrollArea>
    </>
  )
}

/**
 * One end of a connection. The node is looked up rather than passed down
 * because an endpoint can go missing mid-render — undo can retire a node while
 * its edge is still the selection.
 */
function Endpoint({
  role,
  nodeId,
  handleId,
}: {
  role: string
  nodeId: string
  handleId?: string | null
}) {
  const registry = getNodeRegistry()
  const node = useWorkflowStore(
    (state) => state.nodes.find((candidate) => candidate.id === nodeId) ?? null,
  )

  if (!node) {
    return (
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium">{role}</p>
        <p className="text-muted-foreground text-sm">Unknown node</p>
      </div>
    )
  }

  const definition = registry.getNode(node.data.type)
  const category = registry.getCategory(definition.category)
  const outputs = registry.resolveOutputs(definition, node.data.params)

  // Only worth naming on a branching node: on a single-output node the handle
  // adds nothing the endpoint itself does not already say.
  const branch =
    outputs.length > 1
      ? outputs.find((output) => output.id === handleId)
      : undefined

  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-medium">{role}</p>
      <div className="flex items-center gap-3">
        <IconTile icon={definition.icon} className={category.accentClassName} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium">
            {node.data.label}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {definition.label}
          </p>
        </div>
      </div>
      {branch && (
        <p className="text-muted-foreground text-xs">
          Output: <span className="text-foreground">{branch.label ?? branch.id}</span>
        </p>
      )}
    </div>
  )
}

function ConnectionInspector({ edgeId }: { edgeId: string }) {
  const edge = useWorkflowStore(
    (state) => state.edges.find((candidate) => candidate.id === edgeId) ?? null,
  )

  if (!edge) {
    return <EmptyState />
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <IconTile icon={Spline} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Connection</p>
          <p className="text-muted-foreground truncate text-xs">
            Passes the output of one node to the next.
          </p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <Endpoint role="From" nodeId={edge.source} handleId={edge.sourceHandle} />
          <ArrowRight className="text-muted-foreground ml-3 size-4 rotate-90" />
          <Endpoint role="To" nodeId={edge.target} />
        </div>
      </ScrollArea>
    </>
  )
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

function MultiSelection({
  nodeIds,
  edgeIds,
}: {
  nodeIds: string[]
  edgeIds: string[]
}) {
  const parts = [
    nodeIds.length > 0 && countLabel(nodeIds.length, 'node'),
    edgeIds.length > 0 && countLabel(edgeIds.length, 'connection'),
  ].filter(Boolean)

  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Settings2 className="size-5" />
      <p className="text-foreground text-sm">{parts.join(' and ')} selected</p>
      <p className="text-xs">Select a single item to configure it.</p>
    </div>
  )
}

export function InspectorPanel() {
  const { nodeIds, edgeIds } = useSelectedIds()
  const total = nodeIds.length + edgeIds.length

  if (total > 1) {
    return (
      <PanelShell>
        <MultiSelection nodeIds={nodeIds} edgeIds={edgeIds} />
      </PanelShell>
    )
  }

  if (nodeIds.length === 1) {
    return (
      <PanelShell>
        <NodeInspector nodeId={nodeIds[0]} />
      </PanelShell>
    )
  }

  if (edgeIds.length === 1) {
    return (
      <PanelShell>
        <ConnectionInspector edgeId={edgeIds[0]} />
      </PanelShell>
    )
  }

  return (
    <PanelShell>
      <EmptyState />
    </PanelShell>
  )
}
