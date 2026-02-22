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

function FlagPill({ label, enabled }: FlagPillProps) {
  return (
    <span
      className={`inline-flex border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${
        enabled ? "border-primary/40 bg-primary/15 text-foreground" : "border-border bg-surface text-muted"
      }`}
    >
      {label}: {enabled ? "On" : "Off"}
    </span>
  )
}

function summarizeChunksByDocument(documents: DocumentSummaryRecord[]): string {
  if (documents.length === 0) {
    return "0 documents"
  }

  const slices = documents.slice(0, 3).map((document) => `${document.name} (${document.chunk_count})`)
  if (documents.length > 3) {
    slices.push(`+${documents.length - 3} more`)
  }
  return slices.join(" | ")
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

  const selectedChunk: ChunkSummaryRecord | null =
    loadedChunks.find((chunk) => chunk.id === effectiveSelectedChunkId) ?? null

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
                  onClick={() => setSelectedDocumentId(document.id)}
                  className={`border p-3 text-left ${
                    effectiveSelectedDocumentId === document.id
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-surface"
                  }`}
                >
                  <p className="mb-1 text-sm font-semibold">{document.name}</p>
                  <p className="font-mono text-xs text-muted">{document.chunk_count} chunks</p>
                  <p className="font-mono text-xs text-muted">{new Date(document.created_at).toLocaleString()}</p>
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
                      <p className="font-mono text-xs text-muted">
                        workflow={selectedDocument.workflow_mode} | chunking={selectedDocument.chunking_mode} |
                        contextualization={selectedDocument.contextualization_mode}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-muted">{selectedDocument.chunk_count} stored chunks</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <FlagPill label="Normalized" enabled={selectedDocument.used_normalization} />
                    <FlagPill label="Agentic Chunking" enabled={selectedDocument.used_agentic_chunking} />
                    <FlagPill label="Context Headers" enabled={selectedDocument.has_contextual_headers} />
                  </div>
                </div>

                <div className="border border-border bg-surface p-3">
                  <div className="mb-3 grid gap-3 md:grid-cols-[240px_1fr]">
                    <label className="flex flex-col gap-1 text-sm text-muted">
                      Chunk selector
                      <select
                        value={effectiveSelectedChunkId}
                        onChange={(event) => setSelectedChunkId(event.target.value)}
                        className="border border-border bg-background px-3 py-2 text-foreground"
                      >
                        {loadedChunks.map((chunk) => (
                          <option key={chunk.id} value={chunk.id}>
                            Chunk {chunk.chunk_index + 1} ({chunk.start_char}-{chunk.end_char})
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-1 border border-border bg-background px-3 py-2">
                      <p className="font-mono text-xs text-muted">
                        {chunksQuery.isFetching ? "Loading chunks..." : `${loadedChunks.length} chunks loaded`}
                      </p>
                      {selectedChunk?.rationale ? (
                        <p className="text-sm text-foreground">Rationale: {selectedChunk.rationale}</p>
                      ) : (
                        <p className="text-sm text-muted">No rationale available for this chunk.</p>
                      )}
                    </div>
                  </div>

                  {selectedChunk === null ? (
                    <p className="text-sm text-muted">Select a chunk to inspect text variants.</p>
                  ) : (
                    <div className="grid gap-3 xl:grid-cols-3">
                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        Raw Chunk Snapshot
                        <textarea
                          readOnly
                          value={selectedChunk.raw_chunk}
                          className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        Normalized Chunk
                        <textarea
                          readOnly
                          value={selectedChunk.normalized_chunk}
                          className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                        Contextualized Chunk
                        <textarea
                          readOnly
                          value={selectedChunk.contextualized_chunk}
                          className="h-64 border border-border bg-background p-3 font-mono text-xs text-foreground"
                        />
                      </label>
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

export function ProjectsExplorer({ projects, onProjectsRefresh }: ProjectsExplorerProps) {
  const [exploreProjectId, setExploreProjectId] = useState<string>("")
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

  async function handleProjectDelete(project: ProjectRecord): Promise<void> {
    const answer = window.confirm(
      `Delete project '${project.name}'?\n\nThis removes all documents, chunks, and the Qdrant collection.`,
    )
    if (!answer) {
      return
    }

    await deleteProjectMutation.mutateAsync(project.id)
    if (exploreProjectId === project.id) {
      setExploreProjectId("")
    }
    await onProjectsRefresh()
  }

  return (
    <>
      <SectionCard
        title="Project Registry"
        subtitle="Operational table for project namespaces, document/chunk stats, and storage lifecycle actions."
      >
        <div className="overflow-x-auto border border-border bg-background">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-3 py-2 font-semibold text-foreground">Project</th>
                <th className="px-3 py-2 font-semibold text-foreground">Collection</th>
                <th className="px-3 py-2 font-semibold text-foreground">Documents</th>
                <th className="px-3 py-2 font-semibold text-foreground">Total Chunks</th>
                <th className="px-3 py-2 font-semibold text-foreground">Chunks / Document</th>
                <th className="px-3 py-2 font-semibold text-foreground">Flags Summary</th>
                <th className="px-3 py-2 font-semibold text-foreground">Created</th>
                <th className="px-3 py-2 font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-sm text-muted">
                    No projects yet. Create one in Ingestion step 1 (Setup). Test runs do not auto-seed persistent
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
                      <p className="font-semibold text-foreground">{project.name}</p>
                      <p className="font-mono text-xs text-muted">{project.id}</p>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">{project.qdrant_collection_name}</td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {documentQuery?.isFetching ? "..." : documentCount}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-foreground">
                      {documentQuery?.isFetching ? "..." : chunkCount}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">
                      {documentQuery?.isFetching ? "Loading document stats..." : summarizeChunksByDocument(documents)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <FlagPill label="Norm" enabled={anyNormalized} />
                        <FlagPill label="Agentic" enabled={anyAgentic} />
                        <FlagPill label="Context" enabled={anyContext} />
                      </div>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">
                      {new Date(project.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExploreProjectId(project.id)}
                          className="border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-background"
                        >
                          Explore
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleProjectDelete(project)
                          }}
                          disabled={deleteProjectMutation.isPending}
                          className="border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
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
    </>
  )
}
