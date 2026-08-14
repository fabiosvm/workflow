import { useEffect } from 'react'

import { useWorkflowStore } from '@/features/workflow/store'

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Typing in a field has its own undo stack provided by the browser; hijacking
 * the shortcut there would be surprising.
 */
function isEditingText(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return EDITABLE_TAGS.has(target.tagName) || target.isContentEditable
}

/** Binds Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (plus Ctrl+Y) to the graph history. */
export function useHistoryShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || isEditingText(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'z') {
        event.preventDefault()
        const { undo, redo } = useWorkflowStore.getState()
        if (event.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if (key === 'y') {
        event.preventDefault()
        useWorkflowStore.getState().redo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
