import type { PropsWithChildren } from "react"

interface SectionCardProps extends PropsWithChildren {
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export function SectionCard({ title, subtitle, actions, children }: SectionCardProps) {
  const stepMatch = title.match(/^STEP\s+(\d+)\s*-\s*(.+)$/i)

  return (
    <section className="border border-border bg-surface/80 p-4 shadow-sm shadow-black/5 backdrop-blur">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {stepMatch ? (
            <div className="mb-1 flex items-end gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Step</span>
              <span className="font-mono text-3xl font-semibold leading-none text-primary">{stepMatch[1]}</span>
              <h2 className="font-display text-xl font-semibold text-foreground">{stepMatch[2]}</h2>
            </div>
          ) : (
            <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          )}
          {subtitle.trim().length > 0 ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}
