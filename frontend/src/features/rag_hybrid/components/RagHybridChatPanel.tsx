import { useEffect, useRef } from "react"

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

function formatMessageTime(isoValue: string): string {
  const value = new Date(isoValue)
  if (Number.isNaN(value.valueOf())) {
    return ""
  }

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
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
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [messages])

  return (
    <SectionCard
      title="Chat"
      subtitle="Ask grounded questions. Responses stream token-by-token."
      className="h-full min-h-0 flex flex-col"
      bodyClassName="min-h-0 flex-1 grid grid-rows-[auto_1fr_auto] gap-3"
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
      <div className="border border-border bg-background px-3 py-2">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{statusMessage}</span>
          {isStreaming ? <StreamingIndicator /> : null}
        </div>
        {errorMessage.trim().length > 0 ? <p className="mt-1 text-sm text-danger">{errorMessage}</p> : null}
      </div>

      <div ref={messagesContainerRef} className="min-h-0 overflow-y-auto border border-border bg-background p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">No messages yet. Ask your first question.</p>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => (
              <article key={message.id} className={`grid gap-1 ${message.role === "assistant" ? "" : "justify-items-end"}`}>
                <div
                  className={`max-w-[92%] border px-3 py-2 text-sm ${
                    message.role === "assistant"
                      ? "border-border bg-surface text-foreground"
                      : "border-primary bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide opacity-80">
                    {message.role === "assistant" ? "Assistant" : "User"}
                  </p>
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                  {message.isStreaming === true ? (
                    <div className="mt-2">
                      <StreamingIndicator />
                    </div>
                  ) : null}
                </div>
                <p className="px-1 text-[11px] text-muted">{formatMessageTime(message.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        className="border border-border bg-background p-3"
        onSubmit={(event) => {
          event.preventDefault()
          void onSendMessage()
        }}
      >
        <label className="grid gap-2 text-sm text-muted">
          <span className="font-medium text-foreground">Message</span>
          <textarea
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="Ask a grounded question..."
            className="min-h-0 border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="submit"
            disabled={!canSend}
            className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
