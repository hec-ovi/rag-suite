import { useEffect, useRef, useState } from "react"

import type { ThemeMode } from "../../hooks/useThemeMode"
import type { ViewId } from "../../stores/navigation.store"

interface HeaderProps {
  currentView: ViewId
  onViewChange: (view: ViewId) => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

const modeCycle: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
}

const menuLabels: Record<ViewId, string> = {
  start: "Start Here",
  ingestion: "HITL",
  auto_ingest: "AUTOMATED/CLASSIC",
  projects: "Projects",
}

export function Header({ currentView, onViewChange, themeMode, onThemeModeChange }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent): void {
      if (menuRef.current === null) {
        return
      }
      if (!(event.target instanceof Node)) {
        return
      }
      if (!menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleDocumentClick)
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick)
    }
  }, [])

  return (
    <header className="z-50 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => onViewChange("start")}
          className="text-left"
          aria-label="Go to Start Here"
        >
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">RAG Suite</p>
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
          >
            Ingestion Mode: {menuLabels[currentView]}
          </button>
          {isMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+6px)] z-50 grid min-w-40 gap-1 border border-border bg-surface p-1 shadow-lg shadow-black/10"
              role="menu"
            >
              {(Object.entries(menuLabels) as Array<[ViewId, string]>).map(([viewId, label]) => (
                <button
                  key={viewId}
                  type="button"
                  onClick={() => {
                    onViewChange(viewId)
                    setIsMenuOpen(false)
                  }}
                  className={`px-3 py-2 text-left text-sm ${
                    currentView === viewId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
                  }`}
                  role="menuitem"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onThemeModeChange(modeCycle[themeMode])}
          className="border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
          aria-label="Toggle theme mode"
        >
          Theme: {themeMode}
        </button>
      </nav>
    </header>
  )
}
