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

      <div className="mb-3 grid gap-1">
        <p className="text-sm text-muted">Source name</p>
        <div className="flex items-center gap-2">
          <input
            value={fileName}
            onChange={(event) => onFileNameChange(event.target.value)}
            disabled={inputsDisabled}
            className="min-w-0 flex-1 border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Untitled Document"
          />
          <label
            className={`inline-flex h-10 w-10 items-center justify-center border px-2 py-2 ${
              inputsDisabled
                ? "cursor-not-allowed border-border bg-background text-muted"
                : "cursor-pointer border-border bg-primary text-primary-foreground"
            }`}
            aria-label="Upload document"
            title="Upload document"
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
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 2h8l4 4v16H6z" />
              <path d="M14 2v4h4" />
              <path d="M8 14h8M8 18h8" />
            </svg>
          </label>
        </div>
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
