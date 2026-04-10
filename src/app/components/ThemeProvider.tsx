'use client'

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react"

export type Theme = 'day' | 'night'

const ThemeContext = createContext<Theme>('night')

export function useTheme() {
  return useContext(ThemeContext)
}

function computeTheme(): Theme {
  const h = new Date().getHours()
  return h >= 8 && h < 18 ? 'day' : 'night'
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('focus', onStoreChange)
  document.addEventListener('visibilitychange', onStoreChange)

  return () => {
    window.removeEventListener('focus', onStoreChange)
    document.removeEventListener('visibilitychange', onStoreChange)
  }
}

function getSnapshot(): Theme {
  const attribute = document.documentElement.getAttribute('data-theme')

  if (attribute === 'day' || attribute === 'night') {
    return attribute
  }

  return computeTheme()
}

function getServerSnapshot(): Theme {
  return 'night'
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}
