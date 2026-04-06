import { useEffect, useMemo, useRef, useState } from 'react';

export interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  title?: string;
  actions: CommandAction[];
  onClose: () => void;
}

/**
 * Lightweight command palette for power-user navigation and actions.
 */
export function CommandPalette({
  open,
  title = 'Command Palette',
  actions,
  onClose
}: CommandPaletteProps): React.JSX.Element | null {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredActions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return actions;
    }

    return actions.filter((action) => {
      const haystack = [action.label, action.hint ?? '', ...(action.keywords ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [actions, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery('');
    setActiveIndex(0);

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 10);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    if (activeIndex < filteredActions.length) {
      return;
    }

    setActiveIndex(Math.max(0, filteredActions.length - 1));
  }, [activeIndex, filteredActions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (filteredActions.length === 0) {
          return;
        }
        setActiveIndex((previous) => (previous + 1) % filteredActions.length);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (filteredActions.length === 0) {
          return;
        }
        setActiveIndex((previous) => (previous - 1 + filteredActions.length) % filteredActions.length);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const action = filteredActions[activeIndex];
        if (!action) {
          return;
        }

        action.run();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeIndex, filteredActions, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/70 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40">
        <div className="border-b border-zinc-800 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-zinc-400">{title}</p>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
            placeholder="Search commands..."
          />
        </div>

        <ul className="max-h-[55vh] overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No command matches your search.</li>
          ) : (
            filteredActions.map((action, index) => {
              const selected = index === activeIndex;

              return (
                <li key={action.id}>
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selected ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/70'
                    ].join(' ')}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      action.run();
                      onClose();
                    }}
                  >
                    <span>{action.label}</span>
                    {action.hint ? <span className="text-xs text-zinc-500">{action.hint}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
