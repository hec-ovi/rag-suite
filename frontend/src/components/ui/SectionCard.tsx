import type { PropsWithChildren } from "react"

interface SectionCardProps extends PropsWithChildren {
  title: string
  subtitle: string
  actions?: React.ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
}

export function SectionCard({ title, subtitle, actions, className, bodyClassName, headerClassName, children }: SectionCardProps) {
  const stepMatch = title.match(/^STEP\s+(\d+)\s*-\s*(.+)$/i)
  const stepNumber = stepMatch?.[1]?.padStart(2, "0")
  const sectionClassName = className ? `border border-border bg-surface/80 p-4 shadow-sm shadow-black/5 backdrop-blur ${className}` : "border border-border bg-surface/80 p-4 shadow-sm shadow-black/5 backdrop-blur"
  const resolvedHeaderClassName = headerClassName ? `mb-4 flex flex-wrap items-start justify-between gap-3 ${headerClassName}` : "mb-4 flex flex-wrap items-start justify-between gap-3"
  const resolvedBodyClassName = bodyClassName ?? ""

  return (
    <section className={sectionClassName}>
      <header className={resolvedHeaderClassName}>
        <div>
          {stepMatch ? (
            <div className="mb-1 flex items-start gap-3">
              <span className="font-mono text-4xl font-semibold leading-none text-primary">{stepNumber}.</span>
              <div className="pt-0.5">
                <p className="font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.28em] text-primary">
                  STEP
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{stepMatch[2]}</h2>
              </div>
            </div>
          ) : (
            <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
          )}
          {subtitle.trim().length > 0 ? <p className="text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      <div className={resolvedBodyClassName}>{children}</div>
    </section>
  )
}
