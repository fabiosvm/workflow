import { useCallback } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'
import '@/features/workflow/workflow-canvas.css'

import {
  isNodeDrag,
  readNodeDrag,
} from '@/features/workflow/drag-and-drop'
import { WorkflowEdge } from '@/features/workflow/edges/workflow-edge'
import { WorkflowNode } from '@/features/workflow/nodes/workflow-node'
import { useWorkflowStore } from '@/features/workflow/store'
import { canConnect } from '@/features/workflow/validation'

/** Defined at module scope: a new object here would remount every node. */
const nodeTypes: NodeTypes = { workflow: WorkflowNode }
const edgeTypes: EdgeTypes = { workflow: WorkflowEdge }

interface WorkflowCanvasProps {
  colorMode: 'light' | 'dark'
}

/**
 * The `ReactFlowProvider` this component depends on is mounted by `App`, not
 * here: the header and the inspector act on the same instance, so it has to sit
 * above all three.
 */
export function WorkflowCanvas({ colorMode }: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow()

  // Subscribed field by field so unrelated store updates don't re-render here.
  const nodes = useWorkflowStore((state) => state.nodes)
  const edges = useWorkflowStore((state) => state.edges)
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange)
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange)
  const onConnect = useWorkflowStore((state) => state.onConnect)
  const addNode = useWorkflowStore((state) => state.addNode)
  const commit = useWorkflowStore((state) => state.commit)

  /**
   * Checkpointing here rather than on every position change means a whole drag
   * gesture collapses into a single undo step.
   */
  const onNodeDragStart = useCallback(() => commit(), [commit])

  /**
   * Live feedback while dragging a wire — React Flow marks the connection line
   * invalid. The store enforces the same rule; this one is only the affordance.
   */
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => canConnect(connection, edges),
    [edges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!isNodeDrag(event)) {
      return
    }

    // Preventing the default is what makes this element a valid drop target.
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const nodeType = readNodeDrag(event)

      if (!nodeType) {
        return
      }

      event.preventDefault()

      // Drop coordinates are in screen space; the graph works in flow space.
      addNode(
        nodeType,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
      )
    },
    [addNode, screenToFlowPosition],
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStart={onNodeDragStart}
      isValidConnection={isValidConnection}
      onDragOver={onDragOver}
      onDrop={onDrop}
      colorMode={colorMode}
      /**
       * The MIT license does not require a visible credit, but xyflow asks that
       * projects hiding it take a React Flow Pro subscription. Revisit before
       * this ships commercially.
       */
      proOptions={{ hideAttribution: true }}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.2}
      maxZoom={2}
      deleteKeyCode={['Backspace', 'Delete']}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeStrokeWidth={2} />
    </ReactFlow>
  )
}
