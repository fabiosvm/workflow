/**
 * The one and only connection body.
 *
 * It owns the routing — smooth steps rather than beziers, so parallel branches
 * stay readable — and it is the seam where connection chrome would go if the
 * editor ever grows an inline affordance (an insert-node `+`, a payload
 * preview). Acting on a connection currently happens in the inspector panel,
 * so nothing is drawn over the line itself; the hover and selection emphasis
 * in `workflow-canvas.css` is what marks it as interactive.
 */

import { memo } from 'react'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'

function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  style,
}: EdgeProps) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
}

/** Memoized for the same reason as the node: every edge re-renders on pan. */
export const WorkflowEdge = memo(WorkflowEdgeComponent)
