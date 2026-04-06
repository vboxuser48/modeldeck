import { useEffect, useRef, useState } from 'react';
import SimpleMode from '@/components/prompt/SimpleMode';
import templatesCatalog from '@/data/templates.json';
import { Button, Switch } from '@/components/ui';
import { useSettingsStore } from '@/store/settings';
import type { ProjectModeContext, PromptAttachment } from '@/types/ipc';
import type { SessionParameters } from '@/types/session';
import type { PromptTemplate } from '@/types/template';
import TemplatePicker from './TemplatePicker';
import { Paperclip, Plus, Send, Settings2, FolderTree } from 'lucide-react';

export interface PromptSubmitPayload {
  prompt: string;
  parameters: SessionParameters;
  attachments: PromptAttachment[];
  projectMode: ProjectModeContext;
}

interface PromptInputProps {
  params: SessionParameters;
  disabled?: boolean;
  onParamsChange: (next: SessionParameters) => void;
  onSubmit: (payload: PromptSubmitPayload) => void;
}

/**
 * Renders prompt input controls for a session.
 */
export default function PromptInput({
  params,
  disabled,
  onParamsChange,
  onSubmit
}: PromptInputProps): React.JSX.Element {
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [simplePrompt, setSimplePrompt] = useState('');
  const [attachments, setAttachments] = useState<PromptAttachment[]>([]);
  const simplePromptRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customPromptTemplates = useSettingsStore((state) => state.customPromptTemplates);
  const addCustomPromptTemplate = useSettingsStore((state) => state.addCustomPromptTemplate);

  const predefinedTemplates = templatesCatalog as PromptTemplate[];
  const allTemplates = [...predefinedTemplates, ...customPromptTemplates];

  useEffect(() => {
    const onFocusPrompt = (): void => {
      simplePromptRef.current?.focus();
    };

    window.addEventListener('modeldeck:focus-prompt', onFocusPrompt);
    return () => {
      window.removeEventListener('modeldeck:focus-prompt', onFocusPrompt);
    };
  }, []);

  const supportedExtensions: PromptAttachment['extension'][] = ['txt', 'md', 'py', 'js', 'json'];

  const readAttachments = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) {
      return;
    }

    const nextAttachments: PromptAttachment[] = [];

    for (const file of Array.from(files)) {
      const extension = file.name.split('.').pop()?.toLowerCase() as PromptAttachment['extension'] | undefined;
      if (!extension || !supportedExtensions.includes(extension)) {
        continue;
      }

      const content = await file.text();
      nextAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        extension,
        content,
        sizeBytes: file.size
      });
    }

    if (nextAttachments.length > 0) {
      setAttachments((previous) => [...previous, ...nextAttachments]);
    }
  };

  const submitPrompt = (): void => {
    const prompt = simplePrompt.trim();
    if (!prompt && attachments.length === 0 && !params.rawJsonMode) {
      return;
    }

    onSubmit({
      prompt,
      parameters: params,
      attachments,
      projectMode: {
        enabled: params.projectMode,
        version: 1,
        scope: 'session'
      }
    });

    setSimplePrompt('');
    setAttachments([]);
  };

  return (
    <form
      className="shrink-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent"
      onSubmit={(event) => {
        event.preventDefault();
        submitPrompt();
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
      
      {/* Advanced Settings Drawer */}
      {params.advancedMode ? (
        <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl mb-2">
          <button
            type="button"
            onClick={() => setAdvancedControlsOpen((previous) => !previous)}
            className="flex w-full items-center justify-between px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/50"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5" />
              Advanced Controls
            </div>
            <span className="text-zinc-500">{advancedControlsOpen ? 'Hide' : 'Show'}</span>
          </button>

          {advancedControlsOpen ? (
            <div className="grid gap-4 px-4 py-4 grid-cols-2">
              <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
                Temperature ({params.temperature.toFixed(2)})
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                  value={params.temperature}
                  onChange={(event) =>
                    onParamsChange({ ...params, temperature: Number(event.target.value) })
                  }
                  className="accent-zinc-500"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
                Top P
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={disabled}
                  value={params.topP}
                  onChange={(event) => onParamsChange({ ...params, topP: Number(event.target.value) })}
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
                Max Tokens
                <input
                  type="number"
                  min={1}
                  max={8192}
                  step={1}
                  disabled={disabled}
                  value={params.maxTokens}
                  onChange={(event) =>
                    onParamsChange({ ...params, maxTokens: Number(event.target.value) })
                  }
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors"
                />
              </label>

              <label className="grid col-span-2 gap-1.5 text-xs font-medium text-zinc-400">
                System Prompt
                <textarea
                  value={params.systemPrompt}
                  onChange={(event) => onParamsChange({ ...params, systemPrompt: event.target.value })}
                  rows={2}
                  disabled={disabled}
                  className="w-full resize-y rounded-lg border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Optional system behavior instructions"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}
      
      {/* Attachments Area */}
      {attachments.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {attachments.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-medium text-zinc-300 shadow-sm backdrop-blur-md"
            >
              <Paperclip className="h-3 w-3 text-zinc-500" />
              <span>{file.name}</span>
              <button
                type="button"
                className="ml-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                onClick={() => {
                  setAttachments((previous) => previous.filter((entry) => entry.id !== file.id));
                }}
                aria-label={`Remove ${file.name}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-1.5 shadow-xl backdrop-blur-xl focus-within:border-zinc-700 focus-within:bg-zinc-900/80 transition-all duration-200">
        
        {/* Input Tooling Row */}
        <div className="flex items-center gap-1.5 px-2 pt-1 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.py,.js,.json"
            className="hidden"
            onChange={(event) => {
              void readAttachments(event.target.files);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Files"
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </button>
          
          <div className="h-4 w-px bg-zinc-800 mx-1"></div>
          
          <button
            type="button"
            onClick={() => setTemplatesOpen((previous) => !previous)}
            disabled={disabled}
            className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          >
            Templates
          </button>

          <button
            type="button"
            onClick={() => {
              onParamsChange({ ...params, advancedMode: !params.advancedMode });
              if (!params.advancedMode) {
                setAdvancedControlsOpen(true);
              }
            }}
            disabled={disabled}
            className={['flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors', params.advancedMode ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'].join(' ')}
          >
            <Settings2 className="h-3 w-3" />
            Config
          </button>

          <button
            type="button"
            onClick={() => {
              onParamsChange({ ...params, projectMode: !params.projectMode });
            }}
            disabled={disabled}
            className={['flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors', params.projectMode ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'].join(' ')}
          >
            <FolderTree className="h-3 w-3" />
            Project
          </button>
        </div>

        {/* Text Area Row */}
        <div className="relative flex items-end px-2 pb-1 bg-transparent">
          <SimpleMode
            textareaRef={simplePromptRef}
            value={simplePrompt}
            onChange={setSimplePrompt}
            disabled={disabled}
            onSubmit={submitPrompt}
          />
          
          <button
            type="submit"
            disabled={disabled || (!simplePrompt.trim() && attachments.length === 0)}
            className="mb-1 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </div>
      </div>

      <TemplatePicker
        open={templatesOpen}
        templates={allTemplates}
        onClose={() => setTemplatesOpen(false)}
        onSelect={(template) => {
          setSimplePrompt(template.prompt);
          onParamsChange({ ...params, lastTemplateId: template.id });
          setTemplatesOpen(false);
          window.requestAnimationFrame(() => simplePromptRef.current?.focus());
        }}
        onCreateCustom={(template) => {
          addCustomPromptTemplate(template);
        }}
      />

      </div>
    </form>
  );
}
