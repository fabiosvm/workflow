import {
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { startNodeDrag } from '@/features/workflow/drag-and-drop'
import { useLibraryStore } from '@/features/workflow/library'
import { getNodeRegistry } from '@/features/workflow/registry/install'
import type { WorkflowSummary } from '@/types/workflow'

/**
 * One entry in the library. The row selects; the menu beside it acts on the
 * workflow without opening it, so duplicating or deleting one never disturbs
 * what is on the canvas.
 */
function WorkflowItem({
  workflow,
  isActive,
}: {
  workflow: WorkflowSummary
  isActive: boolean
}) {
  const select = useLibraryStore((state) => state.select)
  const duplicate = useLibraryStore((state) => state.duplicate)
  const remove = useLibraryStore((state) => state.remove)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={workflow.name}
        onClick={() => select(workflow.id)}
      >
        <WorkflowIcon />
        <span>{workflow.name}</span>
      </SidebarMenuButton>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction showOnHover aria-label={`Actions for ${workflow.name}`}>
            <MoreHorizontal />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" className="w-40">
          <DropdownMenuItem onSelect={() => duplicate(workflow.id)}>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => remove(workflow.id)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function WorkflowLibrary() {
  const workflows = useLibraryStore((state) => state.workflows)
  const activeId = useLibraryStore((state) => state.activeId)
  const isLoading = useLibraryStore((state) => state.isLoading)
  const create = useLibraryStore((state) => state.create)

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workflows</SidebarGroupLabel>
      {/* Hidden when collapsed to icons: the group label goes with it, and an
          orphaned "+" would have nothing left to say what it creates. */}
      <SidebarGroupAction
        onClick={() => create()}
        title="New workflow"
        aria-label="New workflow"
        className="group-data-[collapsible=icon]:hidden"
      >
        <Plus />
      </SidebarGroupAction>
      <SidebarGroupContent>
        {workflows.length === 0 && !isLoading ? (
          <p className="text-muted-foreground px-2 py-1.5 text-xs group-data-[collapsible=icon]:hidden">
            No workflows yet.
          </p>
        ) : (
          <SidebarMenu>
            {workflows.map((workflow) => (
              <WorkflowItem
                key={workflow.id}
                workflow={workflow}
                isActive={workflow.id === activeId}
              />
            ))}
          </SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const registry = getNodeRegistry()

  return (
    <Sidebar collapsible="icon">
      {/* h-14 + py-1 leaves exactly h-12 for the button, so this header is the
          same height as the main one and their bottom borders form one line. */}
      <SidebarHeader className="h-14 justify-center border-b px-2 py-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <WorkflowIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">Workflow</span>
                <span className="text-muted-foreground truncate text-xs">
                  Automation editor
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <WorkflowLibrary />

        <SidebarSeparator />

        {/* Palette groups come from whatever packs registered — the core has
            no list of its own, so an extension's category shows up here with
            no code change. Categories nobody contributed a node to are hidden. */}
        {registry.listCategories().map((category) => {
          const nodes = registry.listNodesByCategory(category.id)

          if (nodes.length === 0) {
            return null
          }

          return (
            <SidebarGroup key={category.id}>
              <SidebarGroupLabel>{category.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nodes.map((node) => (
                    <SidebarMenuItem key={node.type}>
                      <SidebarMenuButton
                        draggable
                        onDragStart={(event) => startNodeDrag(event, node.type)}
                        tooltip={node.description}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <node.icon />
                        <span>{node.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
