'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cpu, HardDrive, Sparkles } from 'lucide-react';
import { MODEL_CATALOG } from '@/lib/modelCatalog';
import { getRecommendedModels } from '@/lib/hardware';
import { useDownloadsStore } from '@/store/downloads';
import { useWorkspaceStore } from '@/store/workspace';
import type { HardwareProfile } from '@/types/ipc';

interface OnboardingScreenProps {
  onComplete: () => void;
}

function pickTopThree(profile: HardwareProfile) {
  const groups = getRecommendedModels(MODEL_CATALOG, profile);
  return [...groups.ideal, ...groups.capable, ...groups.slow].slice(0, 3);
}

/**
 * First-run onboarding overlay with hardware detection and quick setup.
 */
export default function OnboardingScreen({ onComplete }: OnboardingScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [hardware, setHardware] = useState<HardwareProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startDownload = useDownloadsStore((state) => state.startDownload);

  const activePanelId = useWorkspaceStore((state) => state.activePanelId);
  const panelOrder = useWorkspaceStore((state) => state.panelOrder);
  const panels = useWorkspaceStore((state) => state.panels);
  const addPanel = useWorkspaceStore((state) => state.addPanel);
  const updateSessionModel = useWorkspaceStore((state) => state.updateSessionModel);
  const updateSessionProvider = useWorkspaceStore((state) => state.updateSessionProvider);

  useEffect(() => {
    const loadHardware = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
        if (!bridge) {
          setError('Electron API unavailable in browser-only runtime.');
          setLoading(false);
          return;
        }

        const response = await bridge.system.getHardwareProfile();
        if (!response.success || !response.data) {
          setError(response.error ?? 'Failed to detect hardware.');
          setLoading(false);
          return;
        }

        setHardware(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to detect hardware.');
      } finally {
        setLoading(false);
      }
    };

    void loadHardware();
  }, []);

  const recommendations = useMemo(() => {
    if (!hardware) {
      return [];
    }

    return pickTopThree(hardware);
  }, [hardware]);

  const bestModel = recommendations[0];

  const handleQuickSetup = async (): Promise<void> => {
    if (!bestModel) {
      onComplete();
      return;
    }

    setWorking(true);
    setError(null);

    try {
      await startDownload(bestModel.id);

      const targetPanelId = activePanelId ?? panelOrder[0];
      const targetPanel = targetPanelId ? panels.get(targetPanelId) : undefined;

      if (targetPanel) {
        updateSessionProvider(targetPanel.sessionId, 'ollama');
        updateSessionModel(targetPanel.sessionId, bestModel.id);
      } else {
        addPanel({ modelId: bestModel.id, provider: 'ollama' });
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick setup failed.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/96 px-4">
      <section className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-2xl">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-zinc-100">Welcome to ModelDeck</h1>
          <p className="mt-2 text-sm text-zinc-400">Run AI models locally with full control</p>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-400">Detected Hardware</p>

            {loading ? <p className="text-sm text-zinc-500">Detecting CPU, RAM, and GPU...</p> : null}

            {!loading && hardware ? (
              <ul className="space-y-2 text-sm text-zinc-200">
                <li className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-zinc-400" />
                  <span className="truncate">{hardware.cpu.model} ({hardware.cpu.cores} cores)</span>
                </li>
                <li className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-zinc-400" />
                  <span>{hardware.ram.totalGB} GB RAM</span>
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-400" />
                  <span>
                    {hardware.vram.detected
                      ? `${hardware.vram.gpuName} (${hardware.vram.totalGB} GB VRAM)`
                      : 'GPU not detected'}
                  </span>
                </li>
              </ul>
            ) : null}

            {!loading && !hardware ? (
              <p className="text-sm text-amber-300">Hardware detection unavailable.</p>
            ) : null}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="mb-3 text-xs uppercase tracking-wider text-zinc-400">Recommended Models</p>

            {loading ? <p className="text-sm text-zinc-500">Preparing recommendations...</p> : null}

            {!loading && recommendations.length > 0 ? (
              <ol className="space-y-2 text-sm text-zinc-200">
                {recommendations.map((model, index) => (
                  <li key={model.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                    <p className="font-medium text-zinc-100">{index + 1}. {model.name}</p>
                    <p className="text-xs text-zinc-500">{model.id}</p>
                  </li>
                ))}
              </ol>
            ) : null}

            {!loading && recommendations.length === 0 ? (
              <p className="text-sm text-zinc-500">No recommendation available yet.</p>
            ) : null}
          </section>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleQuickSetup}
            disabled={working || loading}
            className="rounded-lg border border-emerald-700 bg-emerald-900 px-5 py-2 text-sm font-medium text-emerald-100 disabled:opacity-50"
          >
            {working ? 'Setting up...' : 'Quick Setup'}
          </button>

          <button
            type="button"
            onClick={onComplete}
            disabled={working}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </section>
    </div>
  );
}
