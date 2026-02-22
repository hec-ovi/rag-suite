import type { PropsWithChildren } from "react"

interface SectionCardProps extends PropsWithChildren {
  title: string
  subtitle: string
  actions?: React.ReactNode
}

export function SectionCard({ title, subtitle, actions, children }: SectionCardProps) {
  return (
    <section className="border border-border bg-surface/80 p-4 shadow-sm shadow-black/5 backdrop-blur">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  )
}
