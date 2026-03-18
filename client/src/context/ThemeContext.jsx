import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { ThemeContext } from './theme-context'

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark'

  const stored = window.localStorage.getItem('theme')
  if (stored === 'day' || stored === 'dark') {
    return stored
  }

  return document.documentElement.classList.contains('theme-day') ? 'day' : 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    const isDayTheme = theme === 'day'

    root.classList.toggle('theme-day', isDayTheme)
    root.style.colorScheme = isDayTheme ? 'light' : 'dark'
    window.localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'day' ? 'dark' : 'day'))
  }, [])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme]
  )

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  )
}
