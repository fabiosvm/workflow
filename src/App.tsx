import { useEffect, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import {
  CircleCheck,
  Moon,
  Redo2,
  Save,
  Sun,
  Trash2,
  TriangleAlert,
  Undo2,
} from 'lucide-react'

import { getWorkflow, listWorkflows } from '@/api/workflows'
import { AppSidebar } from '@/components/app-sidebar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InspectorPanel } from '@/features/workflow/inspector-panel'
import { useWorkflowStore } from '@/features/workflow/store'
import {
  useDeleteElements,
  useSelectedIds,
} from '@/features/workflow/use-selection'
import { WorkflowCanvas } from '@/features/workflow/workflow-canvas'
import { useHistoryShortcuts } from '@/hooks/use-history-shortcuts'
import { useTheme } from '@/hooks/use-theme'
import type { WorkflowSummary } from '@/types/workflow'

function Editor() {
  const { theme, toggleTheme } = useTheme()
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])

  const workflow = useWorkflowStore((state) => state.workflow)
  const loadWorkflow = useWorkflowStore((state) => state.loadWorkflow)
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const isSaving = useWorkflowStore((state) => state.isSaving)
  const save = useWorkflowStore((state) => state.save)
  const undo = useWorkflowStore((state) => state.undo)
  const redo = useWorkflowStore((state) => state.redo)
  const canUndo = useWorkflowStore((state) => state.past.length > 0)
  const canRedo = useWorkflowStore((state) => state.future.length > 0)
  const graphIssues = useWorkflowStore((state) => state.validation.all)

  const { nodeIds, edgeIds } = useSelectedIds()
  const deleteElements = useDeleteElements()
  const selectedCount = nodeIds.length + edgeIds.length

  useHistoryShortcuts()

  useEffect(() => {
    listWorkflows().then(async (summaries) => {
      setWorkflows(summaries)

      if (summaries.length > 0) {
        loadWorkflow(await getWorkflow(summaries[0].id))
      }
    })
  }, [loadWorkflow])

  const handleSelectWorkflow = async (id: string) => {
    loadWorkflow(await getWorkflow(id))
  }

  return (
    <SidebarProvider className="h-full">
      <AppSidebar
        workflows={workflows}
        activeWorkflowId={workflow?.id}
        onSelectWorkflow={handleSelectWorkflow}
      />
      <SidebarInset className="h-full min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-medium">
                {workflow?.name ?? 'Loading…'}
              </h1>
              {isDirty && (
                <Badge variant="outline" className="text-[10px]">
                  Unsaved
                </Badge>
              )}
            </div>
            {workflow?.description && (
              <p className="text-muted-foreground truncate text-xs">
                {workflow.description}
              </p>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                data-testid="graph-status"
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs',
                  graphIssues.length > 0
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {graphIssues.length > 0 ? (
                  <>
                    <TriangleAlert className="size-3.5" />
                    {graphIssues.length}
                  </>
                ) : (
                  <>
                    <CircleCheck className="size-3.5" />
                    Valid
                  </>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-72">
              {graphIssues.length > 0 ? (
                <ul className="list-inside list-disc space-y-0.5 text-xs">
                  {graphIssues.map((issue, index) => (
                    <li key={`${issue.nodeId ?? 'workflow'}-${index}`}>
                      {issue.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs">No structural problems found.</p>
              )}
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 />
          </Button>
          {/*
            Grouped with undo/redo rather than sitting on the canvas: these are
            the three buttons that change the graph, and the Delete key needs
            canvas focus — this one works wherever focus happens to be.
          */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteElements({ nodeIds, edgeIds })}
            disabled={selectedCount === 0}
            aria-label="Delete selection"
            title="Delete selection (Del)"
            className="hover:text-destructive"
          >
            <Trash2 />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4!" />
          <Button
            variant="outline"
            size="sm"
            onClick={save}
            disabled={!isDirty || isSaving}
          >
            <Save />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            {workflow && <WorkflowCanvas colorMode={theme} />}
          </div>
          <InspectorPanel />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * The provider wraps the whole editor, not just the canvas: the header's delete
 * button and the inspector both act on the React Flow instance, so all three
 * have to share one.
 */
function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}

export default App
