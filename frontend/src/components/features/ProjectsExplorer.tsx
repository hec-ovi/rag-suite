import { useMemo, useState } from "react"

import { useMutation, useQueries, useQuery } from "@tanstack/react-query"

import { deleteProject, listDocumentChunks, listProjectDocuments } from "../../services/pipeline.service"
import type { ChunkSummaryRecord, DocumentSummaryRecord, ProjectRecord } from "../../types/pipeline"
import { SectionCard } from "../ui/SectionCard"

interface ProjectsExplorerProps {
  projects: ProjectRecord[]
  onProjectsRefresh: () => Promise<void>
}

interface FlagPillProps {
  label: string
  enabled: boolean
}

interface ModeOption {
  label: string
  selected: boolean
}

interface ModeGroupProps {
  label: string
  options: ModeOption[]
}

function FlagPill({ label, enabled }: FlagPillProps) {
  return (
    <span
      className={`flex w-full items-center justify-between border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        enabled ? "border-primary/40 bg-primary/15 text-foreground" : "border-border bg-surface text-muted"
      }`}
    >
      <span>{label}</span>
      <span>{enabled ? "On" : "Off"}</span>
    </span>
  )
}

function ModeGroup({ label, options }: ModeGroupProps) {
  const columnClass = options.length >= 3 ? "grid-cols-3" : "grid-cols-2"

  return (
    <section className="border border-border bg-background p-2">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className={`grid gap-1 ${columnClass}`} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <span
            key={option.label}
            role="radio"
            aria-checked={option.selected}
            className={`border px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide ${
              option.selected
                ? "border-primary/50 bg-primary/15 text-foreground"
                : "border-border bg-surface text-muted"
            }`}
          >
            {option.label}
          </span>
        ))}
      </div>
    </section>
  )
}

function formatShortTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const year = String(date.getFullYear() % 100).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  return `${month}/${day}/${year} ${hours}:${minutes}`
}

function totalChunks(documents: DocumentSummaryRecord[]): number {
  return documents.reduce((accumulator, document) => accumulator + document.chunk_count, 0)
}

interface ExploreModalProps {
  project: ProjectRecord
  documents: DocumentSummaryRecord[]
  onClose: () => void
}

function ProjectExploreModal({ project, documents, onClose }: ExploreModalProps) {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("")
  const [selectedChunkId, setSelectedChunkId] = useState<string>("")
  const [selectedChunkView, setSelectedChunkView] = useState<"raw" | "normalized" | "final">("raw")

  const effectiveSelectedDocumentId =
    documents.some((document) => document.id === selectedDocumentId) ? selectedDocumentId : documents[0]?.id ?? ""

  const selectedDocument = documents.find((document) => document.id === effectiveSelectedDocumentId) ?? null

  const chunksQuery = useQuery({
    queryKey: ["document-chunks", effectiveSelectedDocumentId],
    queryFn: () => listDocumentChunks(effectiveSelectedDocumentId),
    enabled: effectiveSelectedDocumentId.length > 0,
  })

  const loadedChunks = chunksQuery.data ?? []
  const effectiveSelectedChunkId =
    loadedChunks.some((chunk) => chunk.id === selectedChunkId) ? selectedChunkId : loadedChunks[0]?.id ?? ""
  const selectedChunkIndex = loadedChunks.findIndex((chunk) => chunk.id === effectiveSelectedChunkId)
  const canGoToPreviousChunk = selectedChunkIndex > 0
  const canGoToNextChunk = selectedChunkIndex >= 0 && selectedChunkIndex < loadedChunks.length - 1

  const selectedChunk: ChunkSummaryRecord | null =
    loadedChunks.find((chunk) => chunk.id === effectiveSelectedChunkId) ?? null

  const contextModeForDisplay = !selectedDocument?.has_contextual_headers
    ? "disabled"
    : selectedDocument.contextualization_mode === "template"
      ? "template"
      : "llm"

  function goToPreviousChunk(): void {
    if (!canGoToPreviousChunk) {
      return
    }
    setSelectedChunkId(loadedChunks[selectedChunkIndex - 1]?.id ?? "")
  }

  function goToNextChunk(): void {
    if (!canGoToNextChunk) {
      return
    }
    setSelectedChunkId(loadedChunks[selectedChunkIndex + 1]?.id ?? "")
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <section className="grid h-[88vh] w-full max-w-7xl grid-rows-[auto_1fr] border border-border bg-background shadow-2xl shadow-black/30">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground">Project Explorer</h3>
            <p className="font-mono text-xs text-muted">
              {project.name} | {project.qdrant_collection_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
          >
            Close
          </button>
        </header>

        <div className="grid min-h-0 gap-0 md:grid-cols-[320px_1fr]">
          <aside className="min-h-0 overflow-y-auto border-r border-border bg-surface/70 p-3">
            <p className="mb-2 font-mono text-xs uppercase tracking-wide text-muted">Documents ({documents.length})</p>
            <div className="grid gap-2">
              {documents.length === 0 ? <p className="text-sm text-muted">No documents found for this project.</p> : null}
              {documents.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocumentId(document.id)
                    setSelectedChunkId("")
                  }}
                  className={`border p-3 text-left ${
                    effectiveSelectedDocumentId === document.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-surface"
                  }`}
                >
                  <p className="mb-1 text-sm font-semibold">{document.name}</p>
                  <p className="font-mono text-xs text-muted">{document.chunk_count} chunks</p>
                  <p className="font-mono text-xs text-muted">{formatShortTimestamp(document.created_at)}</p>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-4">
            {selectedDocument === null ? (
              <p className="text-sm text-muted">Select a document to inspect chunk lineage.</p>
            ) : (
              <div className="grid gap-4">
                <div className="border border-border bg-surface p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-display text-lg font-semibold text-foreground">{selectedDocument.name}</h4>
                    </div>
                    <p className="font-mono text-xs text-muted">{selectedDocument.chunk_count} stored chunks</p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <ModeGroup
                      label="Workflow"
                      options={[
                        { label: "HITL", selected: selectedDocument.workflow_mode === "manual" },
                        { label: "Auto", selected: selectedDocument.workflow_mode === "automatic" },
                      ]}
                    />
                    <ModeGroup
                      label="Chunk"
                      options={[
                        { label: "Deterministic", selected: selectedDocument.chunking_mode === "deterministic" },
                        { label: "Agentic", selected: selectedDocument.chunking_mode === "agentic" },
                      ]}
                    />
                    <ModeGroup
                      label="Context"
                      options={[
                        { label: "Disabled", selected: contextModeForDisplay === "disabled" },
                        { label: "Template", selected: contextModeForDisplay === "template" },
                        { label: "LLM", selected: contextModeForDisplay === "llm" },
                      ]}
                    />
                    <ModeGroup
                      label="Normalization"
                      options={[
                        { label: "Off", selected: !selectedDocument.used_normalization },
                        { label: "On", selected: selectedDocument.used_normalization },
                      ]}
                    />
                    <ModeGroup
                      label="Contextual Retrieval"
                      options={[
                        { label: "Off", selected: !selectedDocument.has_contextual_headers },
                        { label: "On", selected: selectedDocument.has_contextual_headers },
                      ]}
                    />
                  </div>
                </div>

                <div className="border border-border bg-surface p-3">
                  <div className="mb-3 grid gap-2">
                    <div className="flex items-center justify-between gap-2 border border-border bg-background px-3 py-2">
                      <button
                        type="button"
                        onClick={goToPreviousChunk}
                        disabled={!canGoToPreviousChunk}
                        className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <p className="font-mono text-xs text-muted">
                        Chunk {selectedChunkIndex >= 0 ? selectedChunkIndex + 1 : 0} of {loadedChunks.length} |{" "}
                        {selectedChunk === null ? "No range" : `${selectedChunk.start_char}-${selectedChunk.end_char}`}
                      </p>
                      <button
                        type="button"
                        onClick={goToNextChunk}
                        disabled={!canGoToNextChunk}
                        className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {selectedChunk === null ? (
                    <p className="text-sm text-muted">Select a chunk to inspect text variants.</p>
                  ) : (
                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Chunk text variants">
                        <button
                          type="button"
                          onClick={() => setSelectedChunkView("raw")}
                          role="tab"
                          aria-selected={selectedChunkView === "raw"}
                          className={`border border-b-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                            selectedChunkView === "raw"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-surface text-muted"
                          }`}
                        >
                          Raw
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedChunkView("normalized")}
                          role="tab"
                          aria-selected={selectedChunkView === "normalized"}
                          className={`border border-b-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                            selectedChunkView === "normalized"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-surface text-muted"
                          }`}
                        >
                          Normalized
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedChunkView("final")}
                          role="tab"
                          aria-selected={selectedChunkView === "final"}
                          className={`border border-b-0 px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                            selectedChunkView === "final"
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-surface text-muted"
                          }`}
                        >
                          Final Chunk
                        </button>
                      </div>

                      {selectedChunkView === "raw" ? (
                        <label className="flex flex-col gap-1 border border-border bg-background p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                          Raw Chunk Snapshot
                          <textarea
                            readOnly
                            value={selectedChunk.raw_chunk}
                            className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                          />
                        </label>
                      ) : null}

                      {selectedChunkView === "normalized" ? (
                        <label className="flex flex-col gap-1 border border-border bg-background p-3 text-xs font-semibold uppercase tracking-wide text-muted">
                          Normalized Chunk
                          <textarea
                            readOnly
                            value={selectedChunk.normalized_chunk}
                            className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                          />
                        </label>
                      ) : null}

                      {selectedChunkView === "final" ? (
                        <div className="grid gap-3 border border-border bg-background p-3">
                          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                            Header
                            <textarea
                              readOnly
                              value={selectedChunk.context_header ?? ""}
                              className="h-20 border border-border bg-background p-3 font-mono text-xs text-foreground"
                              placeholder="No contextual header for this chunk."
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                            Final Chunk
                            <textarea
                              readOnly
                              value={selectedChunk.contextualized_chunk}
                              className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

interface DeleteConfirmModalProps {
  project: ProjectRecord
  deleting: boolean
  onCancel: () => void
  onConfirm: () => Promise<void>
}

function DeleteConfirmModal({ project, deleting, onCancel, onConfirm }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
      <section className="w-full max-w-md border border-border bg-background shadow-2xl shadow-black/30">
        <header className="border-b border-border bg-surface px-4 py-3">
          <h3 className="font-display text-lg font-semibold text-foreground">Delete Project</h3>
          <p className="mt-1 text-sm text-muted">This action removes all project documents, chunks, and collection data.</p>
        </header>

        <div className="px-4 py-4">
          <p className="text-sm text-foreground">
            Confirm deletion of <span className="font-semibold">{project.name}</span>?
          </p>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void onConfirm()
            }}
            disabled={deleting}
            className="border border-danger/50 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </footer>
      </section>
    </div>
  )
}

export function ProjectsExplorer({ projects, onProjectsRefresh }: ProjectsExplorerProps) {
  const [exploreProjectId, setExploreProjectId] = useState<string>("")
  const [deleteProjectId, setDeleteProjectId] = useState<string>("")
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
  })

  const documentQueries = useQueries({
    queries: projects.map((project) => ({
      queryKey: ["project-documents", project.id],
      queryFn: () => listProjectDocuments(project.id),
      staleTime: 30_000,
    })),
  })

  const documentsByProject = useMemo(() => {
    const records = new Map<string, DocumentSummaryRecord[]>()
    projects.forEach((project, index) => {
      records.set(project.id, documentQueries[index]?.data ?? [])
    })
    return records
  }, [documentQueries, projects])

  const activeProject = projects.find((project) => project.id === exploreProjectId) ?? null
  const activeDocuments = activeProject === null ? [] : documentsByProject.get(activeProject.id) ?? []
  const pendingDeleteProject = projects.find((project) => project.id === deleteProjectId) ?? null

  async function handleProjectDeleteConfirm(): Promise<void> {
    if (pendingDeleteProject === null) {
      return
    }

    await deleteProjectMutation.mutateAsync(pendingDeleteProject.id)
    if (exploreProjectId === pendingDeleteProject.id) {
      setExploreProjectId("")
    }
    setDeleteProjectId("")
    await onProjectsRefresh()
  }

  return (
    <>
      <SectionCard
        title="Project Registry"
        subtitle="Operational table for project namespaces, document/chunk stats, and storage lifecycle actions."
      >
        <div className="overflow-x-auto border border-border bg-background">
          <table className="min-w-[820px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-3 py-2 font-semibold text-foreground">Project</th>
                <th className="px-3 py-2 font-semibold text-foreground">Documents</th>
                <th className="px-3 py-2 font-semibold text-foreground">Total Chunks</th>
                <th className="px-3 py-2 font-semibold text-foreground">Flags Summary</th>
                <th className="px-3 py-2 font-semibold text-foreground">Created</th>
                <th className="px-3 py-2 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted">
                    No projects yet. Create one in Vectorization step 1 (Setup). Test runs do not auto-seed persistent
                    projects.
                  </td>
                </tr>
              ) : null}

              {projects.map((project, index) => {
                const documentQuery = documentQueries[index]
                const documents = documentsByProject.get(project.id) ?? []
                const documentCount = documents.length
                const chunkCount = totalChunks(documents)
                const anyNormalized = documents.some((document) => document.used_normalization)
                const anyAgentic = documents.some((document) => document.used_agentic_chunking)
                const anyContext = documents.some((document) => document.has_contextual_headers)

                return (
                  <tr key={project.id} className="border-b border-border align-top">
                  <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExploreProjectId(project.id)}
                        className="font-semibold text-foreground underline decoration-border/80 underline-offset-4 hover:text-primary"
                      >
                        {project.name}
                      </button>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {documentQuery?.isFetching ? "..." : documentCount}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {documentQuery?.isFetching ? "..." : chunkCount}
                    </td>
                    <td className="px-3 py-3">
                      <div className="grid gap-1">
                        <FlagPill label="Norm" enabled={anyNormalized} />
                        <FlagPill label="Agentic" enabled={anyAgentic} />
                        <FlagPill label="Ctx Retrieval" enabled={anyContext} />
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">
                      {formatShortTimestamp(project.created_at)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setDeleteProjectId(project.id)}
                        disabled={deleteProjectMutation.isPending}
                        className="inline-flex items-center justify-center border border-danger/50 bg-danger/10 p-2 text-danger disabled:opacity-60"
                        aria-label={`Delete ${project.name}`}
                        title={`Delete ${project.name}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="currentColor">
                          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 21h12a1 1 0 0 0 1-1V8H5v12a1 1 0 0 0 1 1Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {activeProject !== null ? (
        <ProjectExploreModal
          project={activeProject}
          documents={activeDocuments}
          onClose={() => setExploreProjectId("")}
        />
      ) : null}

      {pendingDeleteProject !== null ? (
        <DeleteConfirmModal
          project={pendingDeleteProject}
          deleting={deleteProjectMutation.isPending}
          onCancel={() => setDeleteProjectId("")}
          onConfirm={handleProjectDeleteConfirm}
        />
      ) : null}
    </>
  )
}
