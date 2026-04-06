'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Download, FolderOpen, History, Trash2, MessageSquare, Box, Terminal, Settings } from 'lucide-react';
import { exportSessionAsJson, exportSessionAsMarkdown, loadWorkspaceSnapshot } from '@/lib/session';
import { useWorkspaceStore } from '@/store/workspace';
import type { Session } from '@/types/session';
import { Button } from '@/components/ui';

/**
 * Converts a timestamp to compact relative text.
 */
function relativeTime(value: string): string {
  const now = Date.now();
  const target = new Date(value).getTime();
  const diffMs = Math.max(0, now - target);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Triggers a file download from in-memory content.
 */
function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/' },
  { id: 'models', label: 'Models', icon: Box, href: '/models' },
  { id: 'api', label: 'API Reference', icon: Terminal, href: '/api-reference' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

/**
 * Renders the primary sidebar including global navigation and saved sessions.
 */
export default function SessionSidebar(): React.JSX.Element {
  const pathname = usePathname();
  const [savedSessions, setSavedSessions] = useState<Session[]>([]);
  const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
  const loadedTimerRef = useRef<number | null>(null);
  
  const loadSessionIntoPanel = useWorkspaceStore((state) => state.loadSessionIntoPanel);
  const createEmptySessionInActivePanel = useWorkspaceStore((state) => state.createEmptySessionInActivePanel);
  const deleteSession = useWorkspaceStore((state) => state.deleteSession);
  const activePanelId = useWorkspaceStore((state) => state.activePanelId);

  const closeDetailsMenu = (event: React.MouseEvent<HTMLElement>): void => {
    const details = (event.currentTarget as HTMLElement).closest('details') as HTMLDetailsElement | null;
    if (details) {
      details.open = false;
    }
  };

  const markLoaded = (sessionId: string): void => {
    setLoadedSessionId(sessionId);

    if (loadedTimerRef.current !== null) {
      window.clearTimeout(loadedTimerRef.current);
    }

    loadedTimerRef.current = window.setTimeout(() => {
      setLoadedSessionId(null);
      loadedTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => {
    const loadSnapshotSessions = async (): Promise<void> => {
      const snapshot = await loadWorkspaceSnapshot();
      setSavedSessions(snapshot?.sessions ?? []);
    };

    const onSnapshotUpdated = (event: Event): void => {
      const customEvent = event as CustomEvent<import('@/types/session').WorkspaceSnapshot | null>;
      setSavedSessions(customEvent.detail?.sessions ?? []);
    };

    void loadSnapshotSessions();
    window.addEventListener('modeldeck:snapshot-updated', onSnapshotUpdated as EventListener);

    return () => {
      window.removeEventListener('modeldeck:snapshot-updated', onSnapshotUpdated as EventListener);

      if (loadedTimerRef.current !== null) {
        window.clearTimeout(loadedTimerRef.current);
      }
    };
  }, []);

  const sortedSessions = useMemo(
    () =>
      [...savedSessions].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [savedSessions]
  );

  return (
    <aside className="flex min-h-0 h-full w-[260px] flex-col border-r border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
      <div className="border-b border-zinc-800 px-3 py-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-800/40 transition-colors">
          <Image
            src="/modeldeck-logo.svg"
            alt="ModelDeck"
            width={132}
            height={32}
            priority
            className="h-7 w-auto"
          />
        </Link>
      </div>

      {/* Global Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href as any}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100 font-medium shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              ].join(' ')}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sessions Section Header */}
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Recent Sessions
        </p>
        <button
          type="button"
          aria-label="New Session"
          className="text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
          onClick={() => {
            const newSessionId = createEmptySessionInActivePanel();
            if (newSessionId) {
              markLoaded(newSessionId);
            }
          }}
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sortedSessions.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-3 text-zinc-500 opacity-80">
            <History className="h-5 w-5" />
            <p className="text-[11px]">No saved sessions</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {sortedSessions.map((session) => (
              <li
                key={session.id}
                className="group relative cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/50"
                onClick={() => {
                  void loadSessionIntoPanel(session.id, activePanelId, session);
                  markLoaded(session.id);
                }}
              >
                <div className="flex flex-col justify-center min-w-0">
                  <p className="truncate text-[13px] font-medium text-zinc-200">
                    {session.name?.trim() || `Session ${session.id.slice(0, 8)}`}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                    {session.provider} • {session.modelId || 'None'}
                  </p>
                  {loadedSessionId === session.id ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Loaded</p>
                  ) : null}
                </div>

                <div className="absolute right-2 top-2.5 hidden items-center gap-1 group-hover:flex">
                  <details className="relative" onClick={(e) => e.stopPropagation()}>
                    <summary className="list-none">
                      <span className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200">
                        <Download className="h-3 w-3" />
                      </span>
                    </summary>
                    <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-zinc-700 bg-zinc-800 p-1 shadow-lg">
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-700"
                        onClick={(event) => {
                          closeDetailsMenu(event);
                          downloadText(`${session.id}.json`, exportSessionAsJson(session), 'application/json');
                        }}
                      >
                        Export JSON
                      </button>
                      <button
                        type="button"
                        className="w-full rounded px-2 py-1.5 text-left text-[11px] text-zinc-200 hover:bg-zinc-700"
                        onClick={(event) => {
                          closeDetailsMenu(event);
                          downloadText(`${session.id}.md`, exportSessionAsMarkdown(session), 'text/markdown');
                        }}
                      >
                        Export Markdown
                      </button>
                    </div>
                  </details>
                  
                  <button
                    type="button"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-zinc-400 hover:bg-red-500/20 hover:text-red-400"
                    onClick={(event) => {
                      event.stopPropagation();
                      const confirmed = window.confirm('Delete this session? This cannot be undone.');
                      if (!confirmed) return;
                      void deleteSession(session.id);
                      setSavedSessions((previous) => previous.filter((item) => item.id !== session.id));
                    }}
                    aria-label="Delete session"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

