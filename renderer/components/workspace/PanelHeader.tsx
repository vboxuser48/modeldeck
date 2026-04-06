import { Square, Trash2, Cpu } from 'lucide-react';
import type { SessionStatus } from '@/types/session';

interface PanelHeaderProps {
  modelId: string;
  modelOptions: Array<{ id: string; name: string }>;
  status: SessionStatus;
  isStreaming: boolean;
  onModelChange: (modelId: string) => void;
  onCancelStream: () => void;
  onStopService: () => void;
  onClearSession: () => void;
}

/**
 * Renders the panel header controls area.
 */
export default function PanelHeader({
  modelId,
  modelOptions,
  status,
  isStreaming,
  onModelChange,
  onCancelStream,
  onStopService,
  onClearSession
}: PanelHeaderProps): React.JSX.Element {
  const hasModelOptions = modelOptions.length > 0;
  const selectedModelValue = hasModelOptions && modelOptions.some((model) => model.id === modelId) ? modelId : '';

  const statusColor = status === 'error' ? 'bg-red-500' :
    status === 'loading-models' || status === 'streaming' ? 'bg-amber-400' : 'bg-zinc-500';

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 px-5 py-3 backdrop-blur-md">
      <div className="mx-auto flex w-full items-center justify-between gap-3">
        
        {/* Left side: Status and Model Selection */}
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center justify-center h-5 w-5 rounded-md bg-zinc-900 border border-zinc-800 shadow-sm">
            <span className={`block h-2 w-2 rounded-full ${statusColor}`} title={status} />
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-700/50 rounded-lg p-0.5 shadow-sm">
            <select
              value={selectedModelValue}
              onChange={(event) => onModelChange(event.target.value)}
              disabled={!hasModelOptions}
              className="modeldeck-select bg-transparent pl-2 pr-8 py-1.5 text-sm font-semibold text-zinc-100 outline-none cursor-pointer"
            >
              {!hasModelOptions ? <option value="">No models installed</option> : null}
              {modelOptions.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-1.5">
          {isStreaming ? (
            <button
              type="button"
              onClick={onCancelStream}
              className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          ) : null}

          <button
            type="button"
            onClick={onStopService}
            title="Stop Service"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
          >
            <Cpu className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClearSession}
            title="Clear Session"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        
      </div>
    </header>
  );
}
