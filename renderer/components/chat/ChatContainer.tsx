import { useEffect, useMemo, useRef, useState } from 'react';
import {
  exportConversationAsJson,
  exportConversationAsMarkdown,
  exportConversationAsMarkdownByRole,
  exportLatestSnippetAsMarkdown
} from '@/lib/chatExport';
import type { ExportRoleFilter } from '@/lib/chatExport';
import type { StreamState } from '@/lib/streaming';
import type { ChatMessage } from '@/types/message';
import type { Session } from '@/types/session';
import MessageBubble from './MessageBubble';
import StreamingRenderer from './StreamingRenderer';

interface ChatContainerProps {
  messages: ChatMessage[];
  streamState: StreamState;
  session: Session;
}

/**
 * Owns chat viewport behavior, list rendering, and stream presentation.
 */
export default function ChatContainer({ messages, streamState, session }: ChatContainerProps): React.JSX.Element {
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [actionState, setActionState] = useState<string>('');
  const [exportRole, setExportRole] = useState<ExportRoleFilter>('assistant');
  const [utilsOpen, setUtilsOpen] = useState(false);

  const isStreaming = streamState.phase === 'starting' || streamState.phase === 'streaming';

  const inputTokens = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== 'user') {
        continue;
      }

      const tokenValue = message.metadata?.inputTokens;
      if (typeof tokenValue === 'number') {
        return tokenValue;
      }
    }

    return 0;
  }, [messages]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    const onScroll = (): void => {
      const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
      setStickToBottom(distanceFromBottom < 64);
    };

    list.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      list.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!stickToBottom) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [messages, streamState.output, streamState.phase, stickToBottom]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent): void => {
      if (!utilsOpen) {
        return;
      }

      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setUtilsOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [utilsOpen]);

  const buildExportContext = () => ({
    sessionId: session.id,
    sessionName: session.name,
    provider: session.provider,
    modelId: session.modelId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages
  });

  const downloadText = (filename: string, content: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 px-4 py-2">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <p className="truncate text-xs uppercase tracking-wider text-zinc-400">{session.name}</p>

          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
              onClick={() => setUtilsOpen((previous) => !previous)}
            >
              Developer Utils
            </button>

            {utilsOpen ? (
              <div className="absolute right-0 z-20 mt-1 w-56 border border-zinc-700 bg-zinc-950 p-1 shadow-xl">
              <div className="px-2 py-1">
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">
                  Role for filtered export
                </label>
                <select
                  value={exportRole}
                  onChange={(event) => setExportRole(event.target.value as ExportRoleFilter)}
                  className="modeldeck-select w-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none"
                >
                  <option value="assistant">assistant</option>
                  <option value="user">user</option>
                  <option value="system">system</option>
                  <option value="tool">tool</option>
                  <option value="all">all</option>
                </select>
              </div>
              <button
                type="button"
                className="w-full px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-900"
                onClick={() => {
                  const content = exportConversationAsJson(buildExportContext());
                  downloadText(`${session.id}.conversation.json`, content, 'application/json');
                  setActionState('Exported JSON');
                  setUtilsOpen(false);
                }}
              >
                Export Conversation (JSON)
              </button>
              <button
                type="button"
                className="w-full px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-900"
                onClick={() => {
                  const content = exportConversationAsMarkdown(buildExportContext());
                  downloadText(`${session.id}.conversation.md`, content, 'text/markdown');
                  setActionState('Exported Markdown');
                  setUtilsOpen(false);
                }}
              >
                Export Conversation (Markdown)
              </button>
              <button
                type="button"
                className="w-full px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-900"
                onClick={() => {
                  const content = exportConversationAsMarkdownByRole(buildExportContext(), exportRole);
                  downloadText(
                    `${session.id}.conversation.${exportRole}.md`,
                    content,
                    'text/markdown'
                  );
                  setActionState(`Exported ${exportRole} transcript`);
                  setUtilsOpen(false);
                }}
              >
                Export Only Selected Role
              </button>
              <button
                type="button"
                className="w-full px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-900"
                onClick={() => {
                  const content = exportLatestSnippetAsMarkdown(buildExportContext());
                  downloadText(`${session.id}.snippet.md`, content, 'text/markdown');
                  setActionState('Saved snippet');
                  setUtilsOpen(false);
                }}
              >
                Save as Snippet
              </button>
              <button
                type="button"
                className="w-full px-2 py-1 text-left text-xs text-zinc-200 hover:bg-zinc-900"
                onClick={async () => {
                  const content = exportConversationAsMarkdown(buildExportContext());
                  await navigator.clipboard.writeText(content);
                  setActionState('Copied full conversation');
                  setUtilsOpen(false);
                }}
              >
                Copy Full Conversation
              </button>
              </div>
            ) : null}
          </div>
        </div>
        {actionState ? (
          <p className="mx-auto mt-1 w-full max-w-3xl text-[11px] text-emerald-400">{actionState}</p>
        ) : null}
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-sm text-zinc-500">
              No messages yet. Submit a prompt to start streaming.
            </p>
          ) : null}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isStreaming ? (
            <div className="flex w-full justify-start">
              {(() => {
                const streamingPhase: 'starting' | 'streaming' =
                  streamState.phase === 'starting' ? 'starting' : 'streaming';

                return (
              <StreamingRenderer
                content={streamState.output}
                startedAt={streamState.startedAt}
                updatedAt={streamState.updatedAt}
                inputTokens={inputTokens}
                phase={streamingPhase}
              />
                );
              })()}
            </div>
          ) : null}

          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </div>

      {streamState.phase === 'error' && streamState.error ? (
        <div className="border-t border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-300">
          Stream error: {streamState.error}
        </div>
      ) : null}
    </div>
  );
}
