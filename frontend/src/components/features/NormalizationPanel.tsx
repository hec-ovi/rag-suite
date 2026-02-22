import type { DiffLine } from "../../lib/text-diff"
import { SectionCard } from "../ui/SectionCard"

interface NormalizationPanelProps {
  rawText: string
  normalizationEnabled: boolean
  diffLines: DiffLine[]
  onToggleNormalization: () => Promise<void>
  disabled: boolean
}

function diffClassName(kind: DiffLine["kind"]): string {
  if (kind === "added") {
    return "border-l-2 border-emerald-600 bg-emerald-500/20 text-foreground"
  }
  if (kind === "removed") {
    return "border-l-2 border-rose-600 bg-rose-500/20 text-foreground/70"
  }
  return "border-l-2 border-transparent bg-transparent text-foreground"
}

function linePrefix(kind: DiffLine["kind"]): string {
  if (kind === "added") {
    return "+"
  }
  if (kind === "removed") {
    return "-"
  }
  return " "
}

export function NormalizationPanel({
  rawText,
  normalizationEnabled,
  diffLines,
  onToggleNormalization,
  disabled,
}: NormalizationPanelProps) {
  const canToggle = rawText.trim().length > 0
  const addedCount = diffLines.filter((line) => line.kind === "added").length
  const removedCount = diffLines.filter((line) => line.kind === "removed").length

  return (
    <SectionCard
      title="STEP 3 - Normalize Text"
      subtitle="Toggle normalization ON/OFF. ON uses deterministic cleanup output; OFF keeps raw text for downstream steps."
    >
      <div className="border border-border bg-background p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {normalizationEnabled ? "Full Diff (raw vs normalized)" : "Raw Text Preview"}
          </p>
          {normalizationEnabled ? (
            <p className="font-mono text-xs text-muted">
              <span className="mr-3 text-emerald-700">+ {addedCount}</span>
              <span className="text-rose-700">- {removedCount}</span>
            </p>
          ) : null}
        </div>
        <div className="max-h-72 overflow-auto font-mono text-xs">
          {!normalizationEnabled ? (
            rawText.trim().length === 0 ? (
              <p className="text-muted">No source text yet.</p>
            ) : (
              <pre className="whitespace-pre-wrap break-words px-2 py-1 text-foreground">{rawText}</pre>
            )
          ) : (
            <div className="space-y-1">
              {diffLines.map((line, index) => (
                <p key={`${line.kind}-${index.toString(10)}`} className={`flex gap-2 px-2 py-1 ${diffClassName(line.kind)}`}>
                  <span className="w-4 select-none text-center text-muted">{linePrefix(line.kind)}</span>
                  <span className="whitespace-pre-wrap break-words">{line.text.length > 0 ? line.text : " "}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleNormalization}
        disabled={disabled || !canToggle}
        className="mt-3 flex w-full items-center justify-between border border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        <span>Normalize</span>
        <span className="inline-flex items-center gap-2 border border-primary-foreground/40 bg-primary-foreground/10 px-2 py-1 font-mono text-xs">
          <span className="text-primary-foreground/80">Toggle</span>
          <span className="inline-block h-2.5 w-2.5 border border-primary-foreground/60 bg-background/10">
            {normalizationEnabled ? <span className="block h-full w-full bg-primary-foreground" /> : null}
          </span>
          <span>{normalizationEnabled ? "ON" : "OFF"}</span>
        </span>
      </button>
    </SectionCard>
  )
}
