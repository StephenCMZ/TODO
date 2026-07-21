import { useState, useEffect, useCallback } from "react"

type Theme = "light" | "dark"

function setDOMTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
  localStorage.setItem("todo_theme", theme)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const t = (localStorage.getItem("todo_theme") as Theme) || "light"
    setDOMTheme(t)
    return t
  })

  useEffect(() => {
    setDOMTheme(theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "light" ? "dark" : "light"
      setDOMTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
