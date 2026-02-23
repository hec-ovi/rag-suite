import type { RagSessionEntry } from "../types/rag"

interface RagRerankedSessionPanelProps {
  isOpen: boolean
  activeSessionId: string
  sessionEntries: RagSessionEntry[]
  onToggleOpen: () => void
  onSelectSession: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  disabled?: boolean
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

export function RagRerankedSessionPanel({
  isOpen,
  activeSessionId,
  sessionEntries,
  onToggleOpen,
  onSelectSession,
  onDeleteSession,
  disabled = false,
}: RagRerankedSessionPanelProps) {
  if (!isOpen) {
    return (
      <aside className="h-full w-12 border-r border-border bg-surface/90 p-2">
        <button
          type="button"
          onClick={onToggleOpen}
          className="grid w-full place-items-center bg-transparent px-2 py-2 text-muted hover:text-foreground"
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
    <aside className="h-full w-80 border-r border-border bg-surface/90 p-3">
      <header className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Sessions</h2>
        <button
          type="button"
          onClick={onToggleOpen}
          className="grid place-items-center bg-transparent px-2 py-2 text-muted hover:text-foreground"
          aria-label="Collapse sessions"
          title="Collapse sessions"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </header>

      <div className="h-[calc(100%-4.25rem)] space-y-1 overflow-y-auto pr-1">
        {sessionEntries.length === 0 ? (
          <p className="bg-background px-2 py-2 text-sm text-muted">No session entries yet.</p>
        ) : (
          sessionEntries.map((entry) => {
            const active = entry.id === activeSessionId
            return (
              <div
                key={entry.id}
                className={`grid grid-cols-[1fr_auto] items-start gap-2 border-l-2 px-2 py-2 ${
                  active ? "border-primary bg-primary/10" : "border-transparent bg-background hover:border-border"
                }`}
              >
                <button type="button" onClick={() => onSelectSession(entry.id)} className="grid gap-1 text-left">
                  <p className="truncate text-sm font-semibold text-foreground">{entry.title}</p>
                  <p className="text-xs text-muted">
                    {entry.messageCount} msg • {formatSessionTime(entry.updatedAt)}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted">{entry.id}</p>
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDeleteSession(entry.id)}
                  className="mt-0.5 px-1.5 py-1 text-muted transition-colors hover:text-danger disabled:opacity-50"
                  aria-label={`Delete session ${entry.title}`}
                  title="Delete session"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>
    </aside>
  )
}
