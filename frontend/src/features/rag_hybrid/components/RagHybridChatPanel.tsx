import { useEffect, useMemo, useRef } from "react"

import { SectionCard } from "../../../components/ui/SectionCard"
import type { RagChatMessage, RagChatMode } from "../types/rag"

interface RagHybridChatPanelProps {
  messages: RagChatMessage[]
  draftMessage: string
  onDraftMessageChange: (value: string) => void
  onSendMessage: () => Promise<void>
  onInterrupt: () => void
  onClearConversation: () => void
  onOpenSettings: () => void
  onToggleSources: () => void
  onToggleStateless: () => void
  onStartNewSession: () => void
  chatMode: RagChatMode
  statusMessage: string
  errorMessage: string
  disabled: boolean
  isRequesting: boolean
  isStreaming: boolean
  areSourcesOpen: boolean
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

function IconButton({
  onClick,
  label,
  title,
  active = false,
  disabled = false,
  icon,
}: {
  onClick: () => void
  label: string
  title: string
  active?: boolean
  disabled?: boolean
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-semibold disabled:opacity-60 ${
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function RagHybridChatPanel({
  messages,
  draftMessage,
  onDraftMessageChange,
  onSendMessage,
  onInterrupt,
  onClearConversation,
  onOpenSettings,
  onToggleSources,
  onToggleStateless,
  onStartNewSession,
  chatMode,
  statusMessage,
  errorMessage,
  disabled,
  isRequesting,
  isStreaming,
  areSourcesOpen,
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

  const hasMessages = messages.length > 0
  const isStateless = chatMode === "stateless"

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

  return (
    <SectionCard
      title="Chat"
      subtitle=""
      className="h-full min-h-0 flex flex-col"
      bodyClassName="min-h-0 flex-1 grid grid-rows-[auto_1fr_auto] gap-3"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <IconButton
            onClick={onToggleStateless}
            title={isStateless ? "Disable stateless mode" : "Enable stateless mode"}
            label="Stateless"
            active={isStateless}
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 9a3 3 0 016 0v3" />
                <path d="M12 12l-4 9 4-3 4 3-4-9z" />
              </svg>
            }
            disabled={disabled}
          />

          {!isStateless ? (
            <IconButton
              onClick={onStartNewSession}
              title="Start a new persistent session"
              label="New Session"
              icon={
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              }
              disabled={disabled}
            />
          ) : null}

          <IconButton
            onClick={onToggleSources}
            title={areSourcesOpen ? "Hide sources panel" : "Show sources panel"}
            label="Sources"
            active={areSourcesOpen}
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            }
          />

          <IconButton
            onClick={onOpenSettings}
            title="Open settings"
            label="Settings"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8a4 4 0 100 8 4 4 0 000-8z" />
                <path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1 1.56V22a2 2 0 01-4 0v-.09a1.7 1.7 0 00-1-1.56 1.7 1.7 0 00-1.88.34l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.88 1.7 1.7 0 00-1.56-1H2a2 2 0 010-4h.09a1.7 1.7 0 001.56-1 1.7 1.7 0 00-.34-1.88l-.06-.06a2 2 0 012.83-2.83l.06.06a1.7 1.7 0 001.88.34h.01a1.7 1.7 0 001-1.56V2a2 2 0 014 0v.09a1.7 1.7 0 001 1.56 1.7 1.7 0 001.88-.34l.06-.06a2 2 0 012.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.88v.01a1.7 1.7 0 001.56 1H22a2 2 0 010 4h-.09a1.7 1.7 0 00-1.56 1z" />
              </svg>
            }
          />

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
        {!hasMessages ? (
          <p className="text-sm text-muted">No messages yet. Ask your first question.</p>
        ) : (
          <div className="grid gap-3">
            {renderedMessages.map(({ message, answer, thinkingBlocks }) => (
              <article
                key={message.id}
                className={`grid gap-1 ${message.role === "assistant" ? "" : "justify-items-end"}`}
              >
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

                  {message.role === "assistant" && thinkingBlocks.length > 0 ? (
                    <div className="mb-2 grid gap-1">
                      <details className="border border-border bg-background px-2 py-1 text-foreground">
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
        <div className="relative">
          <input
            value={draftMessage}
            onChange={(event) => onDraftMessageChange(event.target.value)}
            disabled={disabled}
            placeholder="Ask a grounded question..."
            className="!rounded-full w-full border border-border bg-surface px-4 py-3 pr-14 text-foreground"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="!rounded-full absolute right-1 top-1 inline-flex h-10 w-10 items-center justify-center bg-primary text-primary-foreground disabled:opacity-60"
            aria-label="Send message"
            title="Send"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14" />
              <path d="M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
