import { useMemo, useState } from 'react';
import type { PromptTemplate } from '@/types/template';
import { Button, Input } from '@/components/ui';

interface TemplatePickerProps {
  open: boolean;
  templates: PromptTemplate[];
  onClose: () => void;
  onSelect: (template: PromptTemplate) => void;
  onCreateCustom: (template: Omit<PromptTemplate, 'isCustom'>) => void;
}

/**
 * Shows predefined/custom prompt templates and supports creating new templates.
 */
export default function TemplatePicker({
  open,
  templates,
  onClose,
  onSelect,
  onCreateCustom
}: TemplatePickerProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return templates;
    }

    return templates.filter((template) => {
      const haystack = `${template.name} ${template.description}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [query, templates]);

  if (!open) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-zinc-300">Prompt Templates</p>
        <Button variant="ghost" className="px-2 py-1 text-xs" onClick={onClose}>
          Close
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search templates"
        className="mb-3"
      />

      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {filtered.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left hover:bg-zinc-800"
          >
            <p className="text-sm text-zinc-100">
              {template.name}
              {template.isCustom ? <span className="ml-2 text-[11px] text-zinc-400">Custom</span> : null}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{template.description}</p>
          </button>
        ))}
        {filtered.length === 0 ? <p className="text-xs text-zinc-500">No matching templates.</p> : null}
      </div>

      <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-2">
        <summary className="cursor-pointer text-xs uppercase tracking-wider text-zinc-300">
          Create Custom Template
        </summary>
        <div className="mt-2 grid gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Template name"
          />
          <Input
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Short description"
          />
          <textarea
            value={newPrompt}
            onChange={(event) => setNewPrompt(event.target.value)}
            rows={6}
            className="w-full resize-y rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="Structured prompt body"
          />
          <div className="flex justify-end">
            <Button
              className="text-xs"
              onClick={() => {
                const name = newName.trim();
                const description = newDescription.trim();
                const prompt = newPrompt.trim();

                if (!name || !prompt) {
                  return;
                }

                onCreateCustom({
                  id: `custom-${crypto.randomUUID()}`,
                  name,
                  description: description || 'Custom template',
                  prompt
                });

                setNewName('');
                setNewDescription('');
                setNewPrompt('');
              }}
            >
              Save Template
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
