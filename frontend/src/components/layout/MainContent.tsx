import { AnimatePresence, motion } from "framer-motion"

import type { ViewId } from "../../stores/navigation.store"

interface MainContentProps {
  currentView: ViewId
  startView: React.ReactNode
  ingestionView: React.ReactNode
  autoIngestView: React.ReactNode
  projectsView: React.ReactNode
}

export function MainContent({ currentView, startView, ingestionView, autoIngestView, projectsView }: MainContentProps) {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-6">
      <AnimatePresence mode="wait">
        <motion.section
          key={currentView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="h-full space-y-4 overflow-y-auto pr-1"
        >
          {currentView === "start"
            ? startView
            : currentView === "ingestion"
              ? ingestionView
              : currentView === "auto_ingest"
                ? autoIngestView
                : projectsView}
        </motion.section>
      </AnimatePresence>
    </main>
  )
}
