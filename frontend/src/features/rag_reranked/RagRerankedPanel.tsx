import { RagRerankedWorkbench } from "./components/RagRerankedWorkbench"
import { useRagRerankedWorkflow } from "./hooks/useRagRerankedWorkflow"

export function RagRerankedPanel() {
  const { state, actions } = useRagRerankedWorkflow()
  return (
    <div className="h-full min-h-0">
      <RagRerankedWorkbench state={state} actions={actions} />
    </div>
  )
}
