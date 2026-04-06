'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Settings, Cpu, HardDrive, Zap, RefreshCw, Library, Sparkles } from 'lucide-react';
import { useModelsStore } from '@/store/models';
import { useModelRuntimeStore } from '@/store/modelRuntime';
import { useWorkspaceStore } from '@/store/workspace';
import { Switch } from '@/components/ui';

/**
 * Renders global top bar (status bar) with active model runtime controls.
 */
export default function SystemBar(): React.JSX.Element {
  const refreshOllamaModels = useModelsStore((state) => state.refreshOllamaModels);

  const activePanelId = useWorkspaceStore((state) => state.activePanelId);
  const panels = useWorkspaceStore((state) => state.panels);
  const sessions = useWorkspaceStore((state) => state.sessions);

  const provider = useModelRuntimeStore((state) => state.provider);
  const activeModelName = useModelRuntimeStore((state) => state.activeModelName);
  const status = useModelRuntimeStore((state) => state.status);
  const keepModelWarm = useModelRuntimeStore((state) => state.keepModelWarm);
  const isRestarting = useModelRuntimeStore((state) => state.isRestarting);
  const ramUsedMb = useModelRuntimeStore((state) => state.ramUsedMb);
  const ramTotalMb = useModelRuntimeStore((state) => state.ramTotalMb);
  const vramUsedMb = useModelRuntimeStore((state) => state.vramUsedMb);
  const vramTotalMb = useModelRuntimeStore((state) => state.vramTotalMb);
  const setDesiredModelName = useModelRuntimeStore((state) => state.setDesiredModelName);
  const setPanelStatus = useModelRuntimeStore((state) => state.setPanelStatus);
  const setKeepModelWarm = useModelRuntimeStore((state) => state.setKeepModelWarm);
  const restartModel = useModelRuntimeStore((state) => state.restartModel);
  const startRealtime = useModelRuntimeStore((state) => state.startRealtime);
  const stopRealtime = useModelRuntimeStore((state) => state.stopRealtime);

  const activePanel = activePanelId ? panels.get(activePanelId) : undefined;
  const activeSession = activePanel ? sessions.get(activePanel.sessionId) : undefined;
  const panelStatus = activePanel?.status ?? 'idle';
  const preferredModelName = activeSession?.provider === 'ollama' ? activeSession.modelId : '';

  useEffect(() => {
    setDesiredModelName(preferredModelName);
  }, [preferredModelName, setDesiredModelName]);

  useEffect(() => {
    setPanelStatus(panelStatus);
  }, [panelStatus, setPanelStatus]);

  useEffect(() => {
    startRealtime();
    void refreshOllamaModels();

    const modelListInterval = window.setInterval(() => {
      void refreshOllamaModels();
    }, 60000);

    return () => {
      stopRealtime();
      window.clearInterval(modelListInterval);
    };
  }, [refreshOllamaModels, startRealtime, stopRealtime]);

  const statusVisual = useMemo(() => {
    if (status === 'running') {
      return {
        label: 'Running',
        dotClass: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        textClass: 'text-emerald-400'
      };
    }

    if (status === 'loading') {
      return {
        label: 'Loading...',
        dotClass: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse',
        textClass: 'text-amber-400'
      };
    }

    if (status === 'error') {
      return {
        label: 'Error',
        dotClass: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
        textClass: 'text-red-400'
      };
    }

    return {
      label: 'Idle',
      dotClass: 'bg-zinc-500',
      textClass: 'text-zinc-400'
    };
  }, [status]);

  const ramText =
    ramUsedMb !== null && ramTotalMb !== null
      ? `${(ramUsedMb / 1024).toFixed(1)}GB`
      : '--';

  const vramText =
    vramTotalMb !== null
      ? `${((vramUsedMb ?? 0) / 1024).toFixed(1)}GB`
      : '--';

  return (
    <footer className="relative flex h-8 shrink-0 items-center justify-between border-t border-zinc-800/80 bg-[#0d0d0f] px-3 font-mono text-[10px] text-zinc-400 z-50 select-none">
      
      {/* Left items: Status & Provider */}
      <div className="flex h-full items-center gap-4">
        {/* Connection/Status */}
        <div className="flex h-full items-center gap-2 pr-3 border-zinc-800 transition-colors">
          <span className={`h-1.5 w-1.5 rounded-full ${statusVisual.dotClass}`} />
          <span className={`uppercase tracking-wider font-semibold ${statusVisual.textClass}`}>{statusVisual.label}</span>
        </div>

        {/* Active Model */}
        <div className="flex h-full items-center gap-1.5 transition-colors hover:text-zinc-200">
           <Cpu className="h-3 w-3 text-zinc-500" />
           <span className="font-semibold text-zinc-300">{activeModelName || 'No active model'}</span>
           <span className="text-zinc-600">({provider})</span>
        </div>

        {/* RAM Status */}
        <div className="hidden h-full items-center gap-1.5 transition-colors hover:text-zinc-200 sm:flex">
          <HardDrive className="h-3 w-3 text-zinc-500" />
          <span>RAM: {ramText}</span>
        </div>

        {/* VRAM Status */}
        <div className="hidden h-full items-center gap-1.5 transition-colors hover:text-zinc-200 sm:flex">
          <Zap className="h-3 w-3 text-amber-500/80" />
          <span>VRAM: {vramText}</span>
        </div>
      </div>

      {/* Right items: Actions & Navigation */}
      <div className="flex h-full items-center gap-2">
        
        {/* Keep Warm Toggle */}
        <label className="flex h-full cursor-pointer items-center gap-2 px-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200" title="Keep model loaded in memory">
          <span>Warm</span>
          <Switch
            checked={keepModelWarm}
            onCheckedChange={(checked) => {
              void setKeepModelWarm(checked);
            }}
            className="scale-75 data-[state=checked]:bg-zinc-500"
          />
        </label>

        {/* Restart Action */}
        <button
          disabled={!activeModelName || isRestarting}
          onClick={() => void restartModel()}
          className="flex h-full items-center gap-1.5 px-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <RefreshCw className={['h-3 w-3', isRestarting ? 'animate-spin' : ''].join(' ')} />
          <span>{isRestarting ? 'Restarting' : 'Restart'}</span>
        </button>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800" />

        {/* Navigation Links */}
        <Link
          href="/models"
          className="flex h-full items-center gap-1.5 px-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
        >
          <Library className="h-3 w-3" />
          <span className="hidden sm:inline">Library</span>
        </Link>
        
        <Link
          href="/models/recommend"
          className="flex h-full items-center gap-1.5 px-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
        >
          <Sparkles className="h-3 w-3" />
          <span className="hidden md:inline">Recommend</span>
        </Link>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800" />

        <Link
          href="/settings"
          className="flex h-full items-center gap-1.5 px-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-200"
        >
          <Settings className="h-3 w-3" />
        </Link>
      </div>
    </footer>
  );
}
