import { RagHybridWorkbench } from "./components/RagHybridWorkbench"
import { useRagHybridWorkflow } from "./hooks/useRagHybridWorkflow"

export function RagHybridPanel() {
  const { state, actions } = useRagHybridWorkflow()
  return <RagHybridWorkbench state={state} actions={actions} />
}
