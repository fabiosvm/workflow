import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { WorkflowFlowNode } from '@/features/workflow/adapters'
import { getNodeRegistry } from '@/features/workflow/registry/install'
import { useWorkflowStore } from '@/features/workflow/store'
import { NO_ISSUES } from '@/features/workflow/validation'

/**
 * Handles are positioned by percentage so a node with N outputs spreads them
 * evenly down its right edge.
 */
function outputOffset(index: number, total: number) {
  return `${((index + 1) / (total + 1)) * 100}%`
}

/**
 * The one and only node body.
 *
 * Packs describe how their nodes look through `NodeDefinition.appearance`, they
 * do not draw them. That is what lets the warning indicator below — and every
 * piece of chrome added here later — apply to third-party nodes for free.
 */
function WorkflowNodeComponent({ id, data, selected }: NodeProps<WorkflowFlowNode>) {
  const registry = getNodeRegistry()
  const definition = registry.getNode(data.type)
  const category = registry.getCategory(definition.category)
  const outputs = registry.resolveOutputs(definition, data.params)
  const summary = registry.getNodeSummary(definition, data.params)
  const Icon = definition.icon

  // Graph issues come from the store's cached validation, which only changes on
  // structural mutations — dragging this node does not re-run it.
  const graphIssues = useWorkflowStore(
    (state) => state.validation.byNode.get(id) ?? NO_ISSUES,
  )

  const issues = [
    ...registry.getNodeIssues(definition, data.params),
    ...graphIssues.map((issue) => issue.message),
  ]

  /**
   * Nothing floats over the node: selecting it is the whole interaction, and
   * the inspector panel is where acting on it happens. The ring below is the
   * only affordance, which is why it has to read clearly.
   */
  return (
    <div className="relative">
      {definition.hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="size-3! border-2! border-background! bg-muted-foreground!"
        />
      )}

      <Card
        className={cn(
          'w-64 gap-0 py-0 shadow-sm transition-shadow',
          'hover:shadow-md',
          selected && 'ring-ring ring-2 ring-offset-2 ring-offset-background',
          issues.length > 0 && 'border-destructive/40',
        )}
      >
        <CardContent className="flex items-center gap-3 px-3 py-3">
          <div
            className={cn(
              'bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md',
              category.accentClassName,
            )}
          >
            <Icon className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-medium">
              {data.label}
            </p>
            <p className="text-muted-foreground truncate text-xs">{summary}</p>
          </div>

          {issues.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-destructive shrink-0" aria-label="Configuration issues">
                  <TriangleAlert className="size-4" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-64">
                <ul className="list-inside list-disc space-y-0.5 text-xs">
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px]', category.badge.className)}
            >
              {category.badge.label}
            </Badge>
          )}
        </CardContent>
      </Card>

      {outputs.map((output, index) => (
        <div key={output.id}>
          <Handle
            id={output.id}
            type="source"
            position={Position.Right}
            style={{ top: outputOffset(index, outputs.length) }}
            className="size-3! border-2! border-background! bg-primary!"
          />
          {output.label && (
            <span
              className="text-muted-foreground pointer-events-none absolute left-full ml-4 -translate-y-1/2 text-[10px] font-medium"
              style={{ top: outputOffset(index, outputs.length) }}
            >
              {output.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Memoized: React Flow re-renders every node on most store updates, so custom
 * nodes must bail out early to keep large graphs responsive.
 */
export const WorkflowNode = memo(WorkflowNodeComponent)
