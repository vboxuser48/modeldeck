import type { StreamState } from '@/lib/streaming';
import StreamingRenderer from './StreamingRenderer';

export interface CompareLaneView {
  id: string;
  modelId: string;
  streamState: StreamState;
}

interface ModelCompareViewProps {
  lanes: CompareLaneView[];
  latestPrompt: string;
}

/**
 * Renders split-screen streaming responses for multi-model comparison.
 */
export default function ModelCompareView({ lanes, latestPrompt }: ModelCompareViewProps): React.JSX.Element {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-2">
        <div className="mx-auto w-full max-w-6xl">
          <p className="text-[11px] uppercase tracking-wider text-zinc-400">Comparison Prompt</p>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-200">{latestPrompt || 'No prompt submitted yet.'}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-3 xl:grid-cols-2">
          {lanes.map((lane) => (
            <section key={lane.id} className="min-h-[280px] rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <header className="mb-3 flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-xs uppercase tracking-wider text-zinc-300">{lane.modelId}</h3>
                <p className="text-[11px] text-zinc-500">{lane.streamState.phase}</p>
              </header>

              <div className="flex w-full justify-start">
                <StreamingRenderer
                  content={lane.streamState.output}
                  startedAt={lane.streamState.startedAt}
                  updatedAt={lane.streamState.updatedAt}
                  inputTokens={0}
                  phase={
                    lane.streamState.phase === 'starting' || lane.streamState.phase === 'streaming'
                      ? lane.streamState.phase
                      : 'done'
                  }
                />
              </div>

              {lane.streamState.phase === 'error' && lane.streamState.error ? (
                <p className="mt-2 text-xs text-red-300">Error: {lane.streamState.error}</p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
