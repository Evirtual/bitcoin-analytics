import { useEffect, useMemo, useState } from 'react'

type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

function readStoredTheme(): Theme | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'dark' || raw === 'light' ? raw : undefined
  } catch {
    return undefined
  }
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

export function useTheme() {
  const initial = useMemo<Theme>(() => readStoredTheme() ?? getSystemTheme(), [])
  const [theme, setThemeState] = useState<Theme>(initial)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const setTheme = (next: Theme) => setThemeState(next)
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

  return { theme, setTheme, toggleTheme }
}
