import { useEffect, useMemo, useRef } from "react"

import type { RagChatMessage, RagChatMode } from "../types/rag"

interface RagHybridChatPanelProps {
  messages: RagChatMessage[]
  draftMessage: string
  onDraftMessageChange: (value: string) => void
  onSendMessage: () => Promise<void>
  onInterrupt: () => void
  onOpenSettings: () => void
  onToggleStateless: () => void
  onStartNewSession: () => void
  chatMode: RagChatMode
  statusMessage: string
  errorMessage: string
  isInputDisabled: boolean
  isBusy: boolean
  isStreaming: boolean
}

interface ParsedAssistantContent {
  answer: string
  thinkingBlocks: string[]
}

function parseAssistantContent(rawContent: string): ParsedAssistantContent {
  const thinkingBlocks: string[] = []
  const pattern = /<(think|thinking)>([\s\S]*?)<\/\1>/gi

  const answer = rawContent.replace(pattern, (_, __, block: string) => {
    const cleaned = block.trim()
    if (cleaned.length > 0) {
      thinkingBlocks.push(cleaned)
    }
    return ""
  })

  return {
    answer: answer.trim(),
    thinkingBlocks,
  }
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
  onOpenSettings,
  onToggleStateless,
  onStartNewSession,
  chatMode,
  statusMessage,
  errorMessage,
  isInputDisabled,
  isBusy,
  isStreaming,
}: RagHybridChatPanelProps) {
  const isStateless = chatMode === "stateless"
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [messages])

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => {
        if (message.role !== "assistant") {
          return {
            message,
            answer: message.content,
            thinkingBlocks: [] as string[],
          }
        }

        const parsed = parseAssistantContent(message.content)
        return {
          message,
          answer: parsed.answer.length > 0 ? parsed.answer : message.content,
          thinkingBlocks: parsed.thinkingBlocks,
        }
      }),
    [messages],
  )

  const hasMessages = messages.length > 0
  const canSend = draftMessage.trim().length > 0 && !isInputDisabled && !isBusy
  const showStatusRow = statusMessage.trim().length > 0 || errorMessage.trim().length > 0 || isStreaming

  return (
    <section className="relative flex h-full min-h-0 flex-col bg-surface">
      <button
        type="button"
        onClick={onOpenSettings}
        disabled={isBusy}
        className="absolute right-3 top-3 z-10 text-muted transition-colors hover:text-foreground disabled:opacity-60"
        aria-label="Open settings"
        title="Open settings"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
          <path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1 1.56V22a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.88.34l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.88 1.7 1.7 0 00-1.56-1H2a2 2 0 010-4h.09a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.88l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 001.88.34h.01a1.7 1.7 0 001-1.56V2a2 2 0 014 0v.09a1.7 1.7 0 001 1.56 1.7 1.7 0 001.88-.34l.06-.06a2 2 0 012.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.88v.01a1.7 1.7 0 001.56 1H22a2 2 0 010 4h-.09a1.7 1.7 0 00-1.56 1z" />
        </svg>
      </button>

      <header className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onToggleStateless}
          disabled={isBusy}
          className={`border px-3 py-1.5 text-xs font-semibold ${
            isStateless ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
          } disabled:opacity-60`}
        >
          Stateless
        </button>
        {!isStateless ? (
          <button
            type="button"
            onClick={onStartNewSession}
            disabled={isBusy}
            className="border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground disabled:opacity-60"
          >
            New Session
          </button>
        ) : null}
      </header>

      {showStatusRow ? (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            {statusMessage.trim().length > 0 ? <span>{statusMessage}</span> : null}
            {isStreaming ? <span className="text-xs font-medium text-primary">Streaming...</span> : null}
          </div>
          {errorMessage.trim().length > 0 ? <p className="mt-1 text-sm text-danger">{errorMessage}</p> : null}
        </div>
      ) : null}

      <div ref={messagesContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        {!hasMessages ? (
          <p className="pt-3 text-sm text-muted">No messages yet.</p>
        ) : (
          <div className="grid gap-3 pt-1">
            {renderedMessages.map(({ message, answer, thinkingBlocks }) => (
              <article key={message.id} className={`grid gap-1 ${message.role === "assistant" ? "" : "justify-items-end"}`}>
                <div
                  className={`max-w-[92%] px-3 py-2 text-sm ${
                    message.role === "assistant" ? "bg-background text-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wide opacity-80">
                    {message.role === "assistant" ? "Assistant" : "User"}
                  </p>

                  {message.role === "assistant" && thinkingBlocks.length > 0 ? (
                    <div className="mb-2 grid gap-1">
                      <details className="bg-surface px-2 py-1 text-foreground">
                        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wide text-muted">
                          Thinking
                        </summary>
                        <div className="mt-2 space-y-2 text-xs text-muted">
                          {thinkingBlocks.map((block) => (
                            <p key={`${message.id}-${block.slice(0, 12)}`} className="whitespace-pre-wrap break-words">
                              {block}
                            </p>
                          ))}
                        </div>
                      </details>
                    </div>
                  ) : null}

                  <p className="whitespace-pre-wrap break-words leading-relaxed">{answer}</p>
                </div>
                <p className="px-1 text-[11px] text-muted">{formatMessageTime(message.createdAt)}</p>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        className="px-4 pb-4 pt-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (isStreaming || isBusy) {
            onInterrupt()
            return
          }
          void onSendMessage()
        }}
      >
        <div className="relative">
          <input
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            disabled={isInputDisabled || isBusy}
            placeholder="Ask a grounded question..."
            className="!rounded-full w-full bg-background px-4 py-3 pr-14 text-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming ? false : !canSend}
            className="!rounded-full absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground disabled:opacity-60"
            aria-label={isStreaming ? "Stop generation" : "Send message"}
            title={isStreaming ? "Stop" : "Send"}
          >
            {isStreaming ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14" />
                <path d="M13 5l7 7-7 7" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </section>
  )
}
