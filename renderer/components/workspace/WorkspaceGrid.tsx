'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  loadWorkspaceSnapshot,
  saveWorkspaceSnapshot,
  startWorkspaceAutoSave
} from '@/lib/session';
import { useWorkspaceStore } from '@/store/workspace';
import { Button, CommandPalette } from '@/components/ui';
import SessionSidebar from './SessionSidebar';
import SessionPanel from './SessionPanel';

/**
 * Renders the workspace panel grid container.
 */
export default function WorkspaceGrid(): React.JSX.Element {
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const layout = useWorkspaceStore((state) => state.layout);
  const panelsMap = useWorkspaceStore((state) => state.panels);
  const panelOrder = useWorkspaceStore((state) => state.panelOrder);
  const hasStreamingPanels = useWorkspaceStore((state) => state.hasStreamingPanels);
  const sidebarOpen = useWorkspaceStore((state) => state.sidebarOpen);
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar);
  const createEmptySessionInActivePanel = useWorkspaceStore((state) => state.createEmptySessionInActivePanel);
  const ensurePanelCountForLayout = useWorkspaceStore((state) => state.ensurePanelCountForLayout);
  const hydrateSnapshot = useWorkspaceStore((state) => state.hydrateSnapshot);
  const toSnapshot = useWorkspaceStore((state) => state.toSnapshot);

  const panels = useMemo(
    () =>
      panelOrder
        .map((panelId) => panelsMap.get(panelId))
        .filter((panel): panel is NonNullable<typeof panel> => Boolean(panel)),
    [panelOrder, panelsMap]
  );

  const streamingLocked = hasStreamingPanels();

  useEffect(() => {
    const hydrate = async (): Promise<void> => {
      const snapshot = await loadWorkspaceSnapshot();
      if (snapshot) {
        hydrateSnapshot(snapshot);
        return;
      }

      ensurePanelCountForLayout('single');
    };

    void hydrate();
  }, [ensurePanelCountForLayout, hydrateSnapshot]);

  useEffect(() => {
    ensurePanelCountForLayout('single');
  }, [ensurePanelCountForLayout]);

  useEffect(() => {
    const stopAutosave = startWorkspaceAutoSave(() => toSnapshot(), 30000);
    return () => {
      stopAutosave();
    };
  }, [toSnapshot]);

  useEffect(() => {
    void saveWorkspaceSnapshot(toSnapshot());
  }, [layout, panelsMap, panelOrder, toSnapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const metaPressed = event.ctrlKey || event.metaKey;
      if (!metaPressed) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (key === 'n') {
        event.preventDefault();
        createEmptySessionInActivePanel();
        return;
      }

      if (key === 'l') {
        event.preventDefault();
        window.dispatchEvent(new Event('modeldeck:focus-prompt'));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [createEmptySessionInActivePanel, toggleSidebar]);

  const gridClass = useMemo(() => {
    if (layout === 'single') {
      return 'grid-cols-1 grid-rows-1';
    }

    if (layout === 'split') {
      return 'grid-cols-1 grid-rows-2 lg:grid-cols-2 lg:grid-rows-1';
    }

    return 'grid-cols-1 grid-rows-4 lg:grid-cols-2 lg:grid-rows-2';
  }, [layout]);

  const commandActions = useMemo(
    () => [
      {
        id: 'go-workspace',
        label: 'Go to Workspace',
        hint: 'Ctrl+Shift+W',
        keywords: ['home', 'chat', 'workspace'],
        run: () => router.push('/')
      },
      {
        id: 'go-models',
        label: 'Open Model Library',
        hint: 'Ctrl+Shift+M',
        keywords: ['models', 'library', 'download'],
        run: () => router.push('/models')
      },
      {
        id: 'go-recommend',
        label: 'Open Hardware Recommendations',
        keywords: ['recommend', 'hardware', 'vram', 'ram'],
        run: () => router.push('/models/recommend')
      },
      {
        id: 'go-settings',
        label: 'Open Settings',
        keywords: ['settings', 'preferences', 'config'],
        run: () => router.push('/settings')
      },
      {
        id: 'toggle-sidebar',
        label: sidebarOpen ? 'Hide Sessions Sidebar' : 'Show Sessions Sidebar',
        hint: 'Ctrl+B',
        keywords: ['sidebar', 'sessions'],
        run: () => toggleSidebar()
      },
      {
        id: 'new-session',
        label: 'Create New Session',
        hint: 'Ctrl+N',
        keywords: ['new', 'session'],
        run: () => {
          createEmptySessionInActivePanel();
        }
      },
      {
        id: 'focus-prompt',
        label: 'Focus Prompt Input',
        hint: 'Ctrl+L',
        keywords: ['prompt', 'input', 'write'],
        run: () => {
          window.dispatchEvent(new Event('modeldeck:focus-prompt'));
        }
      }
    ],
    [createEmptySessionInActivePanel, router, sidebarOpen, toggleSidebar]
  );

  return (
    <section className="flex min-h-0 flex-1 bg-zinc-950">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={[
            'min-h-0 shrink-0 transition-all duration-300 ease-in-out border-r border-zinc-800/50',
            sidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden'
          ].join(' ')}
        >
          <SessionSidebar />
        </div>

        <div className="flex flex-1 flex-col min-h-0 relative">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {!sidebarOpen ? (
              <Button variant="outline" className="px-3 py-1.5 shadow-sm text-xs rounded-lg backdrop-blur-md bg-zinc-900/80 border-zinc-800" onClick={toggleSidebar}>
                Show Sidebar
              </Button>
            ) : null}
            <Button variant="outline" className="px-3 py-1.5 shadow-sm text-xs rounded-lg backdrop-blur-md bg-zinc-900/80 border-zinc-800 hidden md:flex" onClick={() => setPaletteOpen(true)}>
              Search / Cmd + K
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden p-4 md:p-6 lg:p-8">
            <div className={`mx-auto w-full h-full max-w-6xl grid min-h-0 gap-4 ${gridClass}`}>
              <AnimatePresence mode="popLayout">
                {panels.map((panel, index) => (
                  <motion.div
                    key={panel.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="min-h-0 h-full overflow-hidden shadow-xl rounded-2xl border border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl"
                  >
                    <SessionPanel sessionId={panel.sessionId} panelTitle={`Panel ${index + 1}`} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <CommandPalette
        open={paletteOpen}
        actions={commandActions}
        onClose={() => setPaletteOpen(false)}
      />
    </section>
  );
}
