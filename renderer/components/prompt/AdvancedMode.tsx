import type { SessionParameters } from '@/types/session';

interface AdvancedModeProps {
  userPrompt: string;
  params: SessionParameters;
  disabled?: boolean;
  userPromptRef?: React.RefObject<HTMLTextAreaElement | null>;
  onUserPromptChange: (value: string) => void;
  onParamsChange: (next: SessionParameters) => void;
}

/**
 * Renders advanced prompt mode controls.
 */
export default function AdvancedMode({
  userPrompt,
  params,
  disabled,
  userPromptRef,
  onUserPromptChange,
  onParamsChange
}: AdvancedModeProps): React.JSX.Element {
  return (
    <div className="grid gap-3">
      <details className="border border-zinc-800 bg-zinc-950 p-2" open>
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-zinc-400">
          System Prompt
        </summary>
        <textarea
          value={params.systemPrompt}
          onChange={(event) => onParamsChange({ ...params, systemPrompt: event.target.value })}
          rows={3}
          disabled={disabled}
          className="mt-2 w-full resize-y border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-500"
          placeholder="Optional system behavior instructions"
        />
      </details>

      <textarea
        ref={userPromptRef}
        value={userPrompt}
        onChange={(event) => onUserPromptChange(event.target.value)}
        rows={5}
        disabled={disabled}
        className="w-full resize-y border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-zinc-500"
        placeholder="User prompt"
      />

      <div className="grid gap-2 border border-zinc-800 bg-zinc-950 p-3">
        <label className="grid gap-1 text-xs text-zinc-400">
          Temperature ({params.temperature.toFixed(2)})
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            disabled={disabled}
            value={params.temperature}
            onChange={(event) => onParamsChange({ ...params, temperature: Number(event.target.value) })}
          />
        </label>
        <label className="grid gap-1 text-xs text-zinc-400">
          Max Tokens ({params.maxTokens})
          <input
            type="range"
            min={1}
            max={8192}
            step={1}
            disabled={disabled}
            value={params.maxTokens}
            onChange={(event) => onParamsChange({ ...params, maxTokens: Number(event.target.value) })}
          />
        </label>
        <label className="grid gap-1 text-xs text-zinc-400">
          Top P ({params.topP.toFixed(2)})
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            disabled={disabled}
            value={params.topP}
            onChange={(event) => onParamsChange({ ...params, topP: Number(event.target.value) })}
          />
        </label>
        <label className="grid gap-1 text-xs text-zinc-400">
          Frequency Penalty ({params.frequencyPenalty.toFixed(2)})
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            disabled={disabled}
            value={params.frequencyPenalty}
            onChange={(event) =>
              onParamsChange({ ...params, frequencyPenalty: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-xs text-zinc-300">
        <input
          type="checkbox"
          checked={params.rawJsonMode}
          disabled={disabled}
          onChange={(event) => onParamsChange({ ...params, rawJsonMode: event.target.checked })}
        />
        Raw JSON mode
      </label>

      {params.rawJsonMode ? (
        <textarea
          value={params.rawJsonPayload ?? ''}
          onChange={(event) => onParamsChange({ ...params, rawJsonPayload: event.target.value })}
          rows={8}
          disabled={disabled}
          className="w-full resize-y border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none focus:border-zinc-500"
          placeholder='{"messages": [{"role": "user", "content": "..."}]}'
        />
      ) : null}
    </div>
  );
}
