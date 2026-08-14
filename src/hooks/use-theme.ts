import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'workflow-theme'

function resolveInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Toggles the `dark` class shadcn keys its tokens off. The canvas reads the
 * same value through React Flow's `colorMode`, keeping both in step.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
