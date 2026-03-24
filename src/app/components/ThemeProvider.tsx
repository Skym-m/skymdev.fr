'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type Theme = 'day' | 'night'

const ThemeContext = createContext<Theme>('night')

export function useTheme() {
  return useContext(ThemeContext)
}

function computeTheme(): Theme {
  return 'day' // TEST — forcer le mode jour
  // const h = new Date().getHours()
  // return h >= 8 && h < 18 ? 'day' : 'night'
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('night')

  useEffect(() => {
    const t = computeTheme()
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}
