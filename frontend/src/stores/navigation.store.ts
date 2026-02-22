import { create } from "zustand"

export type ViewId = "start" | "ingestion" | "projects"

interface NavigationStore {
  currentView: ViewId
  setView: (view: ViewId) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentView: "start",
  setView: (view) => set({ currentView: view }),
}))
