import type { ProjectRecord } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ProjectsExplorerProps {
  projects: ProjectRecord[]
}

export function ProjectsExplorer({ projects }: ProjectsExplorerProps) {
  return (
    <SectionCard
      title="Project Registry"
      subtitle="Control-plane namespaces created in SQLite and mapped to Qdrant collections."
    >
      <div className="space-y-3">
        {projects.length === 0 ? <p className="text-sm text-muted">No projects yet.</p> : null}
        {projects.map((project) => (
          <article key={project.id} className="border border-border bg-background p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">{project.name}</h3>
              <p className="font-mono text-xs text-muted">{new Date(project.created_at).toLocaleString()}</p>
            </div>
            <p className="mb-2 text-sm text-muted">{project.description ?? "No description"}</p>
            <p className="font-mono text-xs text-foreground">Collection: {project.qdrant_collection_name}</p>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
