import { useEffect, useState } from "react"

export type ThemeMode = "system" | "light" | "dark"

function resolveSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  const resolved = mode === "system" ? resolveSystemTheme() : mode
  root.classList.toggle("dark", resolved === "dark")
}

export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void } {
  const [mode, setMode] = useState<ThemeMode>("system")

  useEffect(() => {
    applyTheme(mode)

    if (mode !== "system") {
      return
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const listener = () => applyTheme("system")
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [mode])

  return { mode, setMode }
}
