import { SectionCard } from "../ui/SectionCard"

interface SourceEditorPanelProps {
  fileName: string
  onFileNameChange: (value: string) => void
  rawText: string
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  disabled: boolean
  projectReady: boolean
}

export function SourceEditorPanel({
  fileName,
  onFileNameChange,
  rawText,
  onRawTextChange,
  onFileSelect,
  disabled,
  projectReady,
}: SourceEditorPanelProps) {
  const inputsDisabled = disabled || !projectReady

  return (
    <SectionCard
      title="STEP 2 - Add Source Text"
      subtitle="Load source only after project setup. Raw text remains immutable in backend history."
    >
      {!projectReady ? (
        <p className="mb-3 border border-border bg-background px-3 py-2 text-sm text-muted">
          Create or select a project in Step 1 before loading source text.
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex items-center gap-2 border border-border px-3 py-2 text-sm font-medium ${
            inputsDisabled ? "cursor-not-allowed bg-background text-muted" : "cursor-pointer bg-surface text-foreground"
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file !== undefined) {
                void onFileSelect(file)
              }
            }}
            disabled={inputsDisabled}
            className="hidden"
          />
          Upload file
        </label>
        <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-sm text-muted">
          Source name
          <input
            value={fileName}
            onChange={(event) => onFileNameChange(event.target.value)}
            disabled={inputsDisabled}
            className="border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Untitled Document"
          />
        </label>
      </div>

      <label className="block text-sm text-muted">
        Raw text
        <textarea
          value={rawText}
          onChange={(event) => onRawTextChange(event.target.value)}
          disabled={inputsDisabled}
          className="mt-1 h-52 w-full border border-border bg-background p-3 font-mono text-sm text-foreground"
          placeholder="Paste extracted text here if you prefer manual input."
        />
      </label>
    </SectionCard>
  )
}
