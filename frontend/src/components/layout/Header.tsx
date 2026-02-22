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

export function Header({ currentView, onViewChange, themeMode, onThemeModeChange }: HeaderProps) {
  return (
    <header className="z-50 shrink-0 border-b border-border/80 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="font-display text-xl font-semibold tracking-tight text-foreground">RAG Suite</p>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Data Preparation Stage</p>
        </div>

        <div className="flex items-center gap-2 border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => onViewChange("ingestion")}
            className={`px-3 py-1.5 text-sm font-medium transition ${
              currentView === "ingestion" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
            }`}
          >
            Ingestion
          </button>
          <button
            type="button"
            onClick={() => onViewChange("projects")}
            className={`px-3 py-1.5 text-sm font-medium transition ${
              currentView === "projects" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-background"
            }`}
          >
            Projects
          </button>
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
