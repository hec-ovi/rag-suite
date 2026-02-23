import type { RagSessionEntry } from "../types/rag"

interface RagHybridSessionPanelProps {
  isOpen: boolean
  activeSessionId: string
  sessionEntries: RagSessionEntry[]
  onToggleOpen: () => void
  onSelectSession: (sessionId: string) => void
}

function formatSessionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return "--:--"
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export function RagHybridSessionPanel({
  isOpen,
  activeSessionId,
  sessionEntries,
  onToggleOpen,
  onSelectSession,
}: RagHybridSessionPanelProps) {
  if (!isOpen) {
    return (
      <aside className="w-11 border border-border bg-surface/80 p-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="grid w-full place-items-center border border-border bg-background px-2 py-2 text-muted"
          aria-label="Open sessions"
          title="Open sessions"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </aside>
    )
  }

  return (
    <aside className="w-72 border border-border bg-surface/80 p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-foreground">Sessions</h2>
        <button
          type="button"
          onClick={onToggleOpen}
          className="grid place-items-center border border-border bg-background px-2 py-2 text-muted"
          aria-label="Collapse sessions"
          title="Collapse sessions"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </header>

      <div className="max-h-[calc(100vh-18rem)] space-y-1 overflow-y-auto pr-1">
        {sessionEntries.length === 0 ? (
          <p className="border border-border bg-background px-2 py-2 text-sm text-muted">No session entries yet.</p>
        ) : (
          sessionEntries.map((entry) => {
            const active = entry.id === activeSessionId
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectSession(entry.id)}
                className={`grid w-full gap-1 border px-2 py-2 text-left ${
                  active ? "border-primary bg-primary/10" : "border-border bg-background"
                }`}
              >
                <p className="truncate text-sm font-semibold text-foreground">{entry.title}</p>
                <p className="text-xs text-muted">
                  {entry.messageCount} msg • {formatSessionTime(entry.updatedAt)}
                </p>
                <p className="truncate font-mono text-[10px] text-muted">{entry.id}</p>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
