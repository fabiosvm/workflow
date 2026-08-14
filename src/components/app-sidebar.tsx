import { Workflow as WorkflowIcon } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { startNodeDrag } from '@/features/workflow/drag-and-drop'
import { getNodeRegistry } from '@/features/workflow/registry/install'
import type { WorkflowSummary } from '@/types/workflow'

interface AppSidebarProps {
  workflows: WorkflowSummary[]
  activeWorkflowId?: string
  onSelectWorkflow: (id: string) => void
}

export function AppSidebar({
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
}: AppSidebarProps) {
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
        <SidebarGroup>
          <SidebarGroupLabel>Workflows</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflows.map((workflow) => (
                <SidebarMenuItem key={workflow.id}>
                  <SidebarMenuButton
                    isActive={workflow.id === activeWorkflowId}
                    tooltip={workflow.name}
                    onClick={() => onSelectWorkflow(workflow.id)}
                  >
                    <WorkflowIcon />
                    <span>{workflow.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
