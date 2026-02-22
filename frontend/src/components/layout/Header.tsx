import { useEffect, useRef, useState } from "react"

import type { ThemeMode } from "../../hooks/useThemeMode"
import {
  isLoadDataView,
  type LoadDataViewId,
  type RagViewId,
  type ViewId,
} from "../../stores/navigation.store"

interface HeaderProps {
  currentView: ViewId
  onViewChange: (view: ViewId) => void
  themeMode: ThemeMode
  onThemeModeChange: (mode: ThemeMode) => void
}

const themeModes: ThemeMode[] = ["system", "light", "dark"]

const loadDataMenuLabels: Record<LoadDataViewId, string> = {
  start: "Start Here",
  ingestion: "HITL",
  auto_ingest: "AUTOMATED/CLASSIC",
  projects: "Projects",
}

const ragMenuLabels: Record<RagViewId, string> = {
  rag_hybrid: "Hybrid (Sparse + Keywords)",
  rag_reranked: "Hybrid + Re-ranked",
  rag_kg: "Hybrid + Knowledge Graph Enhanced",
}

const sectionLabels: Record<ViewId, string> = {
  ...loadDataMenuLabels,
  ...ragMenuLabels,
}

function ThemeModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
      </svg>
    )
  }

  if (mode === "dark") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" />
      <path d="M8 20h8M12 17v3" />
    </svg>
  )
}

export function Header({ currentView, onViewChange, themeMode, onThemeModeChange }: HeaderProps) {
  const [isLoadDataMenuOpen, setIsLoadDataMenuOpen] = useState(false)
  const [isRagMenuOpen, setIsRagMenuOpen] = useState(false)
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false)
  const loadDataMenuRef = useRef<HTMLDivElement | null>(null)
  const ragMenuRef = useRef<HTMLDivElement | null>(null)
  const themeMenuRef = useRef<HTMLDivElement | null>(null)
  const activeSectionTitle = `${isLoadDataView(currentView) ? "Load Data" : "RAG Mode"} - ${sectionLabels[currentView]}`

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent): void {
      if (!(event.target instanceof Node)) {
        return
      }

      if (loadDataMenuRef.current !== null && !loadDataMenuRef.current.contains(event.target)) {
        setIsLoadDataMenuOpen(false)
      }

      if (ragMenuRef.current !== null && !ragMenuRef.current.contains(event.target)) {
        setIsRagMenuOpen(false)
      }

      if (themeMenuRef.current !== null && !themeMenuRef.current.contains(event.target)) {
        setIsThemeMenuOpen(false)
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
        <div className="text-left">
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">{activeSectionTitle}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div ref={loadDataMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsLoadDataMenuOpen((open) => !open)
                setIsRagMenuOpen(false)
              }}
            className="border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
              aria-haspopup="menu"
              aria-expanded={isLoadDataMenuOpen}
            >
              Load Data
            </button>
            {isLoadDataMenuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+6px)] z-50 grid min-w-56 gap-1 border border-border bg-surface p-1 shadow-lg shadow-black/10"
                role="menu"
              >
                {(Object.entries(loadDataMenuLabels) as Array<[LoadDataViewId, string]>).map(([viewId, label]) => (
                  <button
                    key={viewId}
                    type="button"
                    onClick={() => {
                      onViewChange(viewId)
                      setIsLoadDataMenuOpen(false)
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

          <div ref={ragMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsRagMenuOpen((open) => !open)
                setIsLoadDataMenuOpen(false)
              }}
            className="border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-background"
              aria-haspopup="menu"
              aria-expanded={isRagMenuOpen}
            >
              RAG Mode
            </button>
            {isRagMenuOpen ? (
              <div
                className="absolute right-0 top-[calc(100%+6px)] z-50 grid min-w-64 gap-1 border border-border bg-surface p-1 shadow-lg shadow-black/10"
                role="menu"
              >
                {(Object.entries(ragMenuLabels) as Array<[RagViewId, string]>).map(([viewId, label]) => (
                  <button
                    key={viewId}
                    type="button"
                    onClick={() => {
                      onViewChange(viewId)
                      setIsRagMenuOpen(false)
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
        </div>

        <div ref={themeMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsThemeMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border bg-surface text-foreground hover:bg-background"
            aria-haspopup="menu"
            aria-expanded={isThemeMenuOpen}
            aria-label={`Theme mode: ${themeMode}`}
            title={`Theme mode: ${themeMode}`}
          >
            <ThemeModeIcon mode={themeMode} />
          </button>

          {isThemeMenuOpen ? (
            <div
              className="absolute right-0 top-[calc(100%+6px)] z-50 grid grid-cols-1"
              role="menu"
            >
              {themeModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onThemeModeChange(mode)
                    setIsThemeMenuOpen(false)
                  }}
                  className={`inline-flex h-9 w-9 items-center justify-center border ${
                    themeMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-surface"
                  }`}
                  role="menuitemradio"
                  aria-checked={themeMode === mode}
                  aria-label={mode}
                  title={mode}
                >
                  <ThemeModeIcon mode={mode} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
    </header>
  )
}
