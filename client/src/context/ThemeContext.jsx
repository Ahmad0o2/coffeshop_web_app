import { useEffect, useMemo, useState } from 'react'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme')
    return stored || 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'day') {
      root.classList.add('theme-day')
    } else {
      root.classList.remove('theme-day')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((prev) => (prev === 'day' ? 'dark' : 'day')),
      setTheme,
    }),
    [theme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
