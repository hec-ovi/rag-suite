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
  const canCreate = projectNameDraft.trim().length >= 2

  return (
    <SectionCard
      title="STEP 1 - Create Project"
      subtitle="Choose an existing namespace or create a new one before ingestion."
    >
      <section className="border border-border bg-background p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Select Existing Project</p>
        <p className="mb-2 text-sm text-muted">Recommended if your project namespace already exists.</p>
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
      </section>

      <div className="my-3 border-t border-border" />

      <section className="border border-border bg-background p-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Create New Project</p>
        <p className="mb-2 text-sm text-muted">Use when starting a fresh namespace for this corpus.</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="flex flex-col gap-1 text-sm text-muted">
            New project name
            <input
              value={projectNameDraft}
              onChange={(event) => onProjectNameDraftChange(event.target.value)}
              className="border border-border bg-background px-3 py-2 text-foreground"
              placeholder="Legal Corpus 2026"
            />
          </label>

          <button
            type="button"
            onClick={onProjectCreate}
            disabled={disabled || !canCreate}
            className="bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Create project
          </button>
        </div>
      </section>
    </SectionCard>
  )
}
