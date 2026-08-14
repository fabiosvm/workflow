/**
 * Palette → canvas drag transport.
 *
 * The dragged node type travels in the drag event itself rather than in the
 * store, so an aborted drag leaves no state to clean up. The MIME type is
 * custom so the canvas ignores drags coming from anywhere else (files, text,
 * other apps).
 */

export const NODE_DRAG_MIME = 'application/x-workflow-node'

export function startNodeDrag(event: React.DragEvent, nodeType: string) {
  event.dataTransfer.setData(NODE_DRAG_MIME, nodeType)
  event.dataTransfer.effectAllowed = 'move'
}

export function readNodeDrag(event: React.DragEvent): string | null {
  return event.dataTransfer.getData(NODE_DRAG_MIME) || null
}

export function isNodeDrag(event: React.DragEvent) {
  return event.dataTransfer.types.includes(NODE_DRAG_MIME)
}
