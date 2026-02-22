import { SectionCard } from "../../../components/ui/SectionCard"
import type { RagChatMessage } from "../types/rag"

interface RagHybridChatPanelProps {
  messages: RagChatMessage[]
  draftMessage: string
  onDraftMessageChange: (value: string) => void
  onSendMessage: () => Promise<void>
  onInterrupt: () => void
  onClearConversation: () => void
  statusMessage: string
  errorMessage: string
  disabled: boolean
  isRequesting: boolean
  isStreaming: boolean
}

function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
      <span className="h-1.5 w-1.5 animate-pulse bg-primary" />
      <span className="h-1.5 w-1.5 animate-pulse bg-primary [animation-delay:120ms]" />
      <span className="h-1.5 w-1.5 animate-pulse bg-primary [animation-delay:240ms]" />
      Streaming
    </span>
  )
}

export function RagHybridChatPanel({
  messages,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onInterrupt,
  onClearConversation,
  statusMessage,
  errorMessage,
  disabled,
  isRequesting,
  isStreaming,
}: RagHybridChatPanelProps) {
  const canSend = draftMessage.trim().length > 0 && !disabled

  return (
    <SectionCard
      title="Hybrid Chat"
      subtitle="Conversation panel. Retrieved evidence is shown in the Sources panel."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearConversation}
            disabled={disabled}
            className="border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onInterrupt}
            disabled={!isRequesting && !isStreaming}
            className="border border-danger bg-background px-3 py-2 text-xs font-semibold text-danger disabled:opacity-60"
          >
            Interrupt
          </button>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="border border-border bg-background px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>{statusMessage}</span>
            {isStreaming ? <StreamingIndicator /> : null}
          </div>
          {errorMessage.trim().length > 0 ? <p className="mt-1 text-sm text-danger">{errorMessage}</p> : null}
        </div>

        <div className="grid h-[30rem] min-h-0 grid-rows-[1fr_auto] gap-3">
          <div className="min-h-0 overflow-y-auto border border-border bg-background p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted">No messages yet. Send your first question.</p>
            ) : (
              <div className="grid gap-2">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`border p-2 ${
                      message.role === "assistant"
                        ? "border-border bg-surface text-foreground"
                        : "border-primary bg-primary/10 text-foreground"
                    }`}
                  >
                    <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {message.role === "assistant" ? "Assistant" : "User"}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                    {message.isStreaming === true ? (
                      <div className="mt-1">
                        <StreamingIndicator />
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="border border-border bg-background p-3">
            <label className="grid gap-2 text-sm text-muted">
              Message
              <textarea
                value={draftMessage}
                onChange={(event) => onDraftMessageChange(event.target.value)}
                disabled={disabled}
                rows={5}
                placeholder="Ask a grounded question..."
                className="min-h-0 border border-border bg-background px-3 py-2 text-foreground"
              />
            </label>
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  void onSendMessage()
                }}
                disabled={!canSend}
                className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
