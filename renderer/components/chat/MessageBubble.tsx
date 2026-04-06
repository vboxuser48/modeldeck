import { memo, useState } from 'react';
import { Bot, User, Copy, FileText, TerminalSquare } from 'lucide-react';
import type { ChatMessage } from '@/types/message';
import { formatDuration } from '@/lib/tokenize';

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Renders one chat message bubble.
 */
function MessageBubble({ message }: MessageBubbleProps): React.JSX.Element {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const responseMs = typeof message.metadata?.responseMs === 'number' ? message.metadata.responseMs : undefined;
  const inputTokens = typeof message.metadata?.inputTokens === 'number' ? message.metadata.inputTokens : undefined;
  const outputTokens = typeof message.metadata?.outputTokens === 'number' ? message.metadata.outputTokens : undefined;
  const attachedFiles = Array.isArray(message.metadata?.attachedFiles)
    ? message.metadata.attachedFiles.filter((entry): entry is string => typeof entry === 'string')
    : [];

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const copyText = async (kind: 'plain' | 'markdown' | 'code'): Promise<void> => {
    try {
      const markdown = message.content;
      const code = ['```', message.content, '```'].join('\n');
      const payload = kind === 'markdown' ? markdown : kind === 'code' ? code : message.content;

      await navigator.clipboard.writeText(payload);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 1200);
    }
  };

  return (
    <div className={['flex w-full mb-6', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <article
        className={[
          'flex gap-4 max-w-4xl w-full',
          isUser ? 'flex-row-reverse justify-start' : 'flex-row'
        ].join(' ')}
      >
        <div className="flex-shrink-0 mt-1">
          <div className={['flex h-8 w-8 items-center justify-center rounded-full', isUser ? 'bg-zinc-800' : 'bg-transparent border border-zinc-800 text-zinc-400'].join(' ')}>
            {isUser ? <User className="h-4 w-4 text-zinc-300" /> : <Bot className="h-4 w-4" />}
          </div>
        </div>

        <div className={['flex flex-col min-w-0', isUser ? 'items-end max-w-[75%]' : 'items-start flex-1'].join(' ')}>
          <div
            className={[
              'text-[15px] leading-relaxed break-words',
              isUser
                ? 'bg-zinc-800 text-zinc-100 rounded-3xl px-5 py-3 shadow-sm'
                : 'text-zinc-200 py-1.5'
            ].join(' ')}
          >
            <pre className="whitespace-pre-wrap font-sans block overflow-hidden">{message.content}</pre>
          </div>
          
          <div className={['mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500', isUser ? 'justify-end pr-2' : ''].join(' ')}>
            {isAssistant ? (
              <div className="flex items-center gap-3 mr-2">
                {responseMs !== undefined ? <span>{formatDuration(responseMs)}</span> : null}
                {inputTokens !== undefined && outputTokens !== undefined ? <span>Tokens: {inputTokens} in / {outputTokens} out</span> : null}
              </div>
            ) : null}
            {!isUser && <time dateTime={message.createdAt}>{time}</time>}
          </div>

          {isAssistant ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {attachedFiles.length > 0 ? (
                <span className="mr-2 text-[11px] text-zinc-400">
                  Files: {attachedFiles.join(', ')}
                </span>
              ) : null}
              
              <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => void copyText('plain')}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  title="Copy Plain"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={() => void copyText('markdown')}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  title="Copy Markdown"
                >
                  <FileText className="h-3 w-3" />
                  MD
                </button>
                <button
                  type="button"
                  onClick={() => void copyText('code')}
                  className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 text-[11px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  title="Copy as Code Block"
                >
                  <TerminalSquare className="h-3 w-3" />
                  Code
                </button>
              </div>

              {copyState === 'copied' ? <span className="ml-1 text-[11px] font-medium text-emerald-400">Copied</span> : null}
              {copyState === 'error' ? <span className="ml-1 text-[11px] font-medium text-red-400">Copy failed</span> : null}
            </div>
          ) : null}

          {message.error ? <p className="mt-2 text-xs text-red-400">{message.error}</p> : null}
        </div>
      </article>
    </div>
  );
}

export default memo(MessageBubble);
