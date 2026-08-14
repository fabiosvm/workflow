import { useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import {
  CircleCheck,
  Moon,
  Plus,
  Redo2,
  Save,
  Sun,
  Trash2,
  TriangleAlert,
  Undo2,
  Workflow as WorkflowIcon,
} from 'lucide-react'

import { AppSidebar } from '@/components/app-sidebar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { useLibraryStore } from '@/features/workflow/library'
import { useWorkflowStore } from '@/features/workflow/store'
import {
  useDeleteElements,
  useSelectedIds,
} from '@/features/workflow/use-selection'
import { WorkflowCanvas } from '@/features/workflow/workflow-canvas'
import { useHistoryShortcuts } from '@/hooks/use-history-shortcuts'
import { useTheme } from '@/hooks/use-theme'

/**
 * The name and description, edited in place.
 *
 * Plain inputs rather than the `Input` component: this is a heading that
 * happens to be editable, and it has to keep the header's exact metrics. Like
 * the inspector's fields it writes on every keystroke — there is no form to
 * submit here, only the document, and the toolbar's Save is what persists it.
 */
function WorkflowHeading() {
  const workflow = useWorkflowStore((state) => state.workflow)
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const updateWorkflowMeta = useWorkflowStore((state) => state.updateWorkflowMeta)

  if (!workflow) {
    return (
      <div className="min-w-0 flex-1">
        <h1 className="text-muted-foreground truncate text-sm">No workflow open</h1>
      </div>
    )
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <input
          value={workflow.name}
          onChange={(event) => updateWorkflowMeta({ name: event.target.value })}
          aria-label="Workflow name"
          placeholder="Untitled workflow"
          className="hover:bg-muted focus-visible:bg-muted min-w-0 flex-1 truncate rounded-md bg-transparent px-1.5 py-0.5 text-sm font-medium outline-none"
        />
        {isDirty && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Unsaved
          </Badge>
        )}
      </div>
      <input
        value={workflow.description ?? ''}
        onChange={(event) =>
          updateWorkflowMeta({ description: event.target.value })
        }
        aria-label="Workflow description"
        placeholder="Add a description"
        className="text-muted-foreground hover:bg-muted focus-visible:bg-muted w-full truncate rounded-md bg-transparent px-1.5 py-0.5 text-xs outline-none"
      />
    </div>
  )
}

function GraphStatus() {
  const graphIssues = useWorkflowStore((state) => state.validation.all)
  const workflow = useWorkflowStore((state) => state.workflow)

  // With nothing open there is no graph to be valid about, and an empty
  // editor's "Valid" reads as a verdict on something.
  if (!workflow) {
    return null
  }

  return (
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
  )
}

/**
 * The one dialog the library needs. Both questions it asks are about something
 * the user is on the verge of losing, so they share a shape and differ only in
 * wording — and the store, not this component, decides when either is due.
 */
function PendingActionDialog() {
  const pendingAction = useLibraryStore((state) => state.pendingAction)
  const workflows = useLibraryStore((state) => state.workflows)
  const confirmPending = useLibraryStore((state) => state.confirmPending)
  const cancelPending = useLibraryStore((state) => state.cancelPending)
  const openWorkflow = useWorkflowStore((state) => state.workflow)
  const isDirty = useWorkflowStore((state) => state.isDirty)

  const isDelete = pendingAction?.kind === 'delete'
  const target =
    pendingAction && 'id' in pendingAction
      ? workflows.find((workflow) => workflow.id === pendingAction.id)
      : undefined

  // Deleting is about the workflow the menu was opened on; discarding is about
  // whatever is currently on the canvas, which is not the same workflow.
  const subject = isDelete ? target?.name : openWorkflow?.name

  return (
    <AlertDialog
      open={pendingAction !== null}
      onOpenChange={(open) => {
        if (!open) {
          cancelPending()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete ? 'Delete workflow?' : 'Discard unsaved changes?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDelete ? (
              <>
                “{subject}” will be permanently removed.
                {isDirty && target?.id === openWorkflow?.id
                  ? ' Its unsaved changes go with it.'
                  : ''}
              </>
            ) : (
              <>“{subject}” has changes that were never saved. They will be lost.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isDelete ? 'destructive' : 'default'}
            onClick={() => confirmPending()}
          >
            {isDelete ? 'Delete' : 'Discard changes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function EmptyCanvas() {
  const create = useLibraryStore((state) => state.create)

  return (
    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3">
      <WorkflowIcon className="size-6" />
      <p className="text-sm">Nothing open. Create a workflow to start.</p>
      <Button variant="outline" size="sm" onClick={() => create()}>
        <Plus />
        New workflow
      </Button>
    </div>
  )
}

function Editor() {
  const { theme, toggleTheme } = useTheme()

  const workflow = useWorkflowStore((state) => state.workflow)
  const isDirty = useWorkflowStore((state) => state.isDirty)
  const isSaving = useWorkflowStore((state) => state.isSaving)
  const save = useWorkflowStore((state) => state.save)
  const undo = useWorkflowStore((state) => state.undo)
  const redo = useWorkflowStore((state) => state.redo)
  const canUndo = useWorkflowStore((state) => state.past.length > 0)
  const canRedo = useWorkflowStore((state) => state.future.length > 0)
  const loadLibrary = useLibraryStore((state) => state.load)

  const { nodeIds, edgeIds } = useSelectedIds()
  const deleteElements = useDeleteElements()
  const selectedCount = nodeIds.length + edgeIds.length

  useHistoryShortcuts()

  useEffect(() => {
    loadLibrary()
  }, [loadLibrary])

  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <SidebarInset className="h-full min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <WorkflowHeading />
          <GraphStatus />

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
            {workflow ? <WorkflowCanvas colorMode={theme} /> : <EmptyCanvas />}
          </div>
          <InspectorPanel />
        </div>
      </SidebarInset>

      <PendingActionDialog />
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
