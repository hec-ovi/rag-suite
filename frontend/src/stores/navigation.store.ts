import { create } from "zustand"

export type ViewId = "ingestion" | "projects"

interface NavigationStore {
  currentView: ViewId
  setView: (view: ViewId) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentView: "ingestion",
  setView: (view) => set({ currentView: view }),
}))
