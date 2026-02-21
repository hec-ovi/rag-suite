import { AnimatePresence, motion } from "framer-motion"

import type { ViewId } from "../../stores/navigation.store"

interface MainContentProps {
  currentView: ViewId
  ingestionView: React.ReactNode
  projectsView: React.ReactNode
}

export function MainContent({ currentView, ingestionView, projectsView }: MainContentProps) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
      <AnimatePresence mode="wait">
        <motion.section
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {currentView === "ingestion" ? ingestionView : projectsView}
        </motion.section>
      </AnimatePresence>
    </main>
  )
}
