import { useEffect, useMemo, useState } from 'react';
import { estimateTokenCount, formatDuration } from '@/lib/tokenize';

interface StreamingRendererProps {
  content: string;
  startedAt?: string;
  updatedAt: string;
  inputTokens: number;
  phase: 'starting' | 'streaming' | 'done';
}

/**
 * Renders token-by-token stream output with live telemetry and thinking state.
 */
export default function StreamingRenderer({
  content,
  startedAt,
  updatedAt,
  inputTokens,
  phase
}: StreamingRendererProps): React.JSX.Element {
  const [displayText, setDisplayText] = useState(content);

  useEffect(() => {
    if (displayText === content) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      setDisplayText(content);
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [content, displayText]);

  useEffect(() => {
    if (phase === 'starting') {
      setDisplayText('');
    }
  }, [phase]);

  const outputTokens = useMemo(() => estimateTokenCount(displayText), [displayText]);

  const responseMs = useMemo(() => {
    if (!startedAt) {
      return 0;
    }

    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(updatedAt).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return 0;
    }

    return Math.max(0, endTime - startTime);
  }, [startedAt, updatedAt]);

  const showThinking = phase === 'starting' && displayText.length === 0;

  if (showThinking) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-zinc-200">
        <p className="inline-flex items-center gap-2 text-sm text-zinc-300">
          <span>Thinking</span>
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:240ms]" />
          </span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
          <span>Input: {inputTokens} tokens</span>
        </div>
      </div>
    );
  }

  return (
    <article className="max-w-[85%] rounded-2xl border border-zinc-800 bg-zinc-900/70 px-4 py-3 text-zinc-100 shadow-sm">
      <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-7">{displayText}</pre>
      {phase === 'streaming' ? (
        <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-zinc-300 align-middle" aria-hidden="true" />
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
        <span>Time: {formatDuration(responseMs)}</span>
        <span>Input: {inputTokens} tokens</span>
        <span>Output: {outputTokens} tokens</span>
      </div>
    </article>
  );
}
