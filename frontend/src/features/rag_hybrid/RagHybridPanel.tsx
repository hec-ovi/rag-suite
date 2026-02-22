import { RagHybridWorkbench } from "./components/RagHybridWorkbench"
import { useRagHybridWorkflow } from "./hooks/useRagHybridWorkflow"

export function RagHybridPanel() {
  const { state, actions } = useRagHybridWorkflow()
  return (
    <div className="h-full min-h-0">
      <RagHybridWorkbench state={state} actions={actions} />
    </div>
  )
}
