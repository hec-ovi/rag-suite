import type { DiffLine } from "../../lib/text-diff"
import { SectionCard } from "../ui/SectionCard"

interface NormalizationPanelProps {
  rawText: string
  normalizedText: string
  diffLines: DiffLine[]
  onNormalize: () => Promise<void>
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

export function NormalizationPanel({ rawText, normalizedText, diffLines, onNormalize, disabled }: NormalizationPanelProps) {
  const hasNormalizedOutput = normalizedText.trim().length > 0
  const addedCount = diffLines.filter((line) => line.kind === "added").length
  const removedCount = diffLines.filter((line) => line.kind === "removed").length

  return (
    <SectionCard
      title="Normalization Review"
      subtitle="Deterministic cleanup (spaces, line breaks, repeated short headers/footers) with full-text review."
      actions={
        <button
          type="button"
          onClick={onNormalize}
          disabled={disabled}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {hasNormalizedOutput ? "Re-run normalize" : "Normalize"}
        </button>
      }
    >
      <div className="border border-border bg-background p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {hasNormalizedOutput ? "Full Diff (raw vs normalized)" : "Raw Text Preview"}
          </p>
          <div className="flex items-center gap-3">
            <p
              className={`inline-flex items-center gap-2 border px-2 py-1 font-mono text-xs ${
                hasNormalizedOutput
                  ? "border-emerald-600 bg-emerald-500/20 text-foreground"
                  : "border-border bg-surface text-muted"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 ${
                  hasNormalizedOutput ? "bg-emerald-500" : "border border-border bg-transparent"
                }`}
              />
              {hasNormalizedOutput ? "Normalized" : "Not normalized"}
            </p>
            {hasNormalizedOutput ? (
              <p className="font-mono text-xs text-muted">
                <span className="mr-3 text-emerald-700">+ {addedCount}</span>
                <span className="text-rose-700">- {removedCount}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="max-h-72 overflow-auto font-mono text-xs">
          {!hasNormalizedOutput ? (
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
    </SectionCard>
  )
}
