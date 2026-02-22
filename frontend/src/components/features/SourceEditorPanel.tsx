import { SectionCard } from "../ui/SectionCard"

interface SourceEditorPanelProps {
  fileName: string
  rawText: string
  onRawTextChange: (value: string) => void
  onFileSelect: (file: File) => Promise<void>
  disabled: boolean
}

export function SourceEditorPanel({ fileName, rawText, onRawTextChange, onFileSelect, disabled }: SourceEditorPanelProps) {
  return (
    <SectionCard
      title="Source Text"
      subtitle="Upload PDF/DOCX/TXT or paste extracted text directly. Raw text remains immutable in backend history."
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground">
          <input
            type="file"
            accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file !== undefined) {
                void onFileSelect(file)
              }
            }}
            disabled={disabled}
            className="hidden"
          />
          Upload file
        </label>
        <span className="text-sm text-muted">{fileName.length > 0 ? fileName : "No file selected"}</span>
      </div>

      <label className="block text-sm text-muted">
        Raw text
        <textarea
          value={rawText}
          onChange={(event) => onRawTextChange(event.target.value)}
          className="mt-1 h-52 w-full border border-border bg-background p-3 font-mono text-sm text-foreground"
          placeholder="Paste extracted text here if you prefer manual input."
        />
      </label>
    </SectionCard>
  )
}
