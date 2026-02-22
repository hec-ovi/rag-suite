import { create } from "zustand"

export type LoadDataViewId = "start" | "ingestion" | "auto_ingest" | "projects"
export type RagViewId = "rag_hybrid" | "rag_reranked" | "rag_kg"
export type ViewId = LoadDataViewId | RagViewId

const loadDataViews: Set<ViewId> = new Set(["start", "ingestion", "auto_ingest", "projects"])
const ragViews: Set<ViewId> = new Set(["rag_hybrid", "rag_reranked", "rag_kg"])

export function isLoadDataView(view: ViewId): view is LoadDataViewId {
  return loadDataViews.has(view)
}

export function isRagView(view: ViewId): view is RagViewId {
  return ragViews.has(view)
}

interface NavigationStore {
  currentView: ViewId
  setView: (view: ViewId) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentView: "start",
  setView: (view) => set({ currentView: view }),
}))
