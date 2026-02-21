import type { DiffLine } from "../../lib/text-diff"
import { SectionCard } from "../ui/SectionCard"

interface NormalizationPanelProps {
  normalizedText: string
  diffLines: DiffLine[]
  onNormalize: () => Promise<void>
  disabled: boolean
}

function diffClassName(kind: DiffLine["kind"]): string {
  if (kind === "added") {
    return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200"
  }
  if (kind === "removed") {
    return "bg-rose-500/15 text-rose-900 dark:text-rose-200"
  }
  return "bg-transparent text-muted"
}

export function NormalizationPanel({ normalizedText, diffLines, onNormalize, disabled }: NormalizationPanelProps) {
  return (
    <SectionCard
      title="Normalization Review"
      subtitle="Deterministic cleanup (spaces, line breaks, repeated short headers/footers) with line diff preview."
      actions={
        <button
          type="button"
          onClick={onNormalize}
          disabled={disabled}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Normalize
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Diff (raw -&gt; normalized)</p>
          <div className="max-h-60 space-y-1 overflow-auto font-mono text-xs">
            {diffLines.length === 0 ? <p className="text-muted">No normalization output yet.</p> : null}
            {diffLines.map((line, index) => (
              <p key={`${line.kind}-${index.toString(10)}`} className={`rounded px-2 py-1 ${diffClassName(line.kind)}`}>
                {line.kind === "added" ? "+ " : line.kind === "removed" ? "- " : "  "}
                {line.text}
              </p>
            ))}
          </div>
        </div>

        <label className="block text-xs font-semibold uppercase tracking-wide text-muted">
          Normalized text
          <textarea
            value={normalizedText}
            readOnly
            className="mt-2 h-60 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs text-foreground"
          />
        </label>
      </div>
    </SectionCard>
  )
}
