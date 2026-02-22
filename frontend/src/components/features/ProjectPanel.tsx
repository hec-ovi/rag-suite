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
      subtitle="Choose an existing namespace or create a new one before vectorization."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Existing Project</p>
          <p className="mb-2 text-sm text-muted">Select an existing namespace.</p>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Project
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

        <section className="border border-border bg-background p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Create Project</p>
          <p className="mb-2 text-sm text-muted">Create a new namespace for this corpus.</p>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="flex flex-col gap-1 text-sm text-muted">
              Project name
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
              Create
            </button>
          </div>
        </section>
      </div>
    </SectionCard>
  )
}
