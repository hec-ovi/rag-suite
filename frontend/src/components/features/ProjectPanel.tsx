import type { ProjectRecord } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ProjectPanelProps {
  projects: ProjectRecord[]
  selectedProjectId: string
  projectNameDraft: string
  onProjectNameDraftChange: (value: string) => void
  onProjectCreate: () => Promise<void>
  onProjectSelect: (projectId: string) => void
  disabled: boolean
}

export function ProjectPanel({
  projects,
  selectedProjectId,
  projectNameDraft,
  onProjectNameDraftChange,
  onProjectCreate,
  onProjectSelect,
  disabled,
}: ProjectPanelProps) {
  return (
    <SectionCard
      title="Project Namespace"
      subtitle="Create or select the Qdrant-backed namespace where this document will be indexed."
      actions={
        <button
          type="button"
          onClick={onProjectCreate}
          disabled={disabled}
          className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Create
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-1 text-sm text-muted">
          New project name
          <input
            value={projectNameDraft}
            onChange={(event) => onProjectNameDraftChange(event.target.value)}
            className="border border-border bg-background px-3 py-2 text-foreground"
            placeholder="Legal Corpus 2026"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Current project
          <select
            value={selectedProjectId}
            onChange={(event) => onProjectSelect(event.target.value)}
            className="border border-border bg-background px-3 py-2 text-foreground"
          >
            <option value="">Select project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </SectionCard>
  )
}
