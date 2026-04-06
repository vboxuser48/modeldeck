'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Cpu } from 'lucide-react';
import HardwareProfileCard from '@/components/models/HardwareProfile';
import RecommendedModelCard from '@/components/models/RecommendedModelCard';
import { Button } from '@/components/ui';
import { getEffectiveMemoryGB, getRecommendedModels, scoreModel } from '@/lib/hardware';
import { MODEL_CATALOG, isCatalogModelDownloaded, resolveInstalledModelId } from '@/lib/modelCatalog';
import { useDownloadsStore } from '@/store/downloads';
import { useModelsStore } from '@/store/models';
import { useWorkspaceStore } from '@/store/workspace';
import type { HardwareProfile } from '@/types/ipc';
import type { CatalogModel, ModelTag } from '@/types/model';

const FILTER_TAGS: ModelTag[] = [
  'chat',
  'coding',
  'reasoning',
  'fast',
  'embedding',
  'multilingual',
  'large',
  'vision'
];
const HARDWARE_SCAN_TIMEOUT_MS = 3500;

const FALLBACK_PROFILE: HardwareProfile = {
  ram: {
    totalBytes: 0,
    freeBytes: 0,
    totalGB: 0,
    freeGB: 0
  },
  vram: {
    detected: false,
    totalBytes: 0,
    totalGB: 0,
    gpuName: 'Unknown',
    backend: 'none'
  },
  cpu: {
    model: 'Unknown CPU',
    cores: 0,
    arch: 'unknown'
  },
  platform: 'linux'
};

function filterByTags(models: CatalogModel[], activeTags: Set<ModelTag>): CatalogModel[] {
  if (activeTags.size === 0) {
    return models;
  }

  const tags = Array.from(activeTags);
  return models.filter((model) => tags.every((tag) => model.tags.includes(tag)));
}

/**
 * Resolves with a timeout marker when scan exceeds a short UX threshold.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<{ timedOut: boolean; value?: T }> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      resolve({ timedOut: true });
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve({ timedOut: false, value });
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Hardware-aware recommendations and one-click download onboarding page.
 */
export default function RecommendationsPage(): React.JSX.Element {
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [showSlow, setShowSlow] = useState(false);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [activeTags, setActiveTags] = useState<Set<ModelTag>>(new Set());

  const router = useRouter();

  const refreshOllamaModels = useModelsStore((state) => state.refreshOllamaModels);
  const ollamaModels = useModelsStore((state) => state.ollamaModels);
  const startDownload = useDownloadsStore((state) => state.startDownload);
  const addPanel = useWorkspaceStore((state) => state.addPanel);

  const scanHardware = async (): Promise<void> => {
    setScanning(true);
    setScanError(null);

    try {
      const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
      if (!bridge) {
        setProfile(FALLBACK_PROFILE);
        setScanError('Electron API unavailable in browser-only runtime.');
        return;
      }

      const timedResult = await withTimeout(bridge.system.getHardwareProfile(), HARDWARE_SCAN_TIMEOUT_MS);
      if (timedResult.timedOut) {
        setProfile((previous) => previous ?? FALLBACK_PROFILE);
        setScanError('Hardware scan is taking longer than expected. Showing fallback profile; try Re-scan Hardware.');
        return;
      }

      const result = timedResult.value;
      if (!result) {
        setProfile(FALLBACK_PROFILE);
        setScanError('Hardware scan failed.');
        return;
      }

      if (!result.success || !result.data) {
        setProfile(FALLBACK_PROFILE);
        setScanError(result.error ?? 'Hardware scan failed.');
        return;
      }

      setProfile(result.data);
    } catch (error) {
      setProfile(FALLBACK_PROFILE);
      setScanError(error instanceof Error ? error.message : 'Hardware scan failed.');
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    void refreshOllamaModels();
    void scanHardware();
  }, [refreshOllamaModels]);

  const downloadedIds = useMemo(() => new Set(ollamaModels.map((model) => model.id)), [ollamaModels]);

  const recommendations = useMemo(() => {
    if (!profile) {
      return null;
    }

    return getRecommendedModels(MODEL_CATALOG, profile);
  }, [profile]);

  const effective = useMemo(() => {
    if (!profile) {
      return null;
    }

    return getEffectiveMemoryGB(profile);
  }, [profile]);

  if (scanning || !profile || !recommendations || !effective) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <section className="w-full max-w-md border border-zinc-800 bg-zinc-900 p-6 text-center">
          <Cpu className="mx-auto h-8 w-8 animate-pulse text-indigo-400" />
          <h1 className="mt-3 text-lg font-semibold">Analyzing your hardware...</h1>
          <p className="mt-1 text-sm text-zinc-400">Checking RAM, VRAM, and CPU</p>
        </section>
      </main>
    );
  }

  const idealModels = filterByTags(recommendations.ideal, activeTags);
  const capableModels = filterByTags(recommendations.capable, activeTags);
  const slowModels = filterByTags(recommendations.slow, activeTags);
  const incompatibleModels = filterByTags(recommendations.incompatible, activeTags);

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-5 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900 p-4">
          <div>
            <h1 className="text-xl font-semibold">Hardware Recommendations</h1>
            <p className="text-sm text-zinc-400">Tiered model picks based on your detected RAM/VRAM profile.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void scanHardware()}>
              Re-scan Hardware
            </Button>
            <Link href="/models" className="text-sm text-indigo-300 hover:text-indigo-200">
              Go to Model Library
            </Link>
          </div>
        </header>

        {scanError ? <p className="text-sm text-amber-300">{scanError}</p> : null}

        <HardwareProfileCard profile={profile} />

        <section className="border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-sm text-zinc-300">Filter by tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FILTER_TAGS.map((tag) => {
              const selected = activeTags.has(tag);
              return (
                <Button
                  key={tag}
                  variant={selected ? 'default' : 'outline'}
                  className="rounded-full px-3 py-1 text-xs uppercase tracking-wide"
                  onClick={() => {
                    setActiveTags((previous) => {
                      const next = new Set(previous);
                      if (next.has(tag)) {
                        next.delete(tag);
                      } else {
                        next.add(tag);
                      }
                      return next;
                    });
                  }}
                >
                  {tag}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-base font-semibold text-emerald-300">Perfect for your hardware</h2>
          {idealModels.length === 0 ? (
            <p className="text-sm text-zinc-500">No ideal models for the selected filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {idealModels.map((model) => (
                <RecommendedModelCard
                  key={model.id}
                  model={model}
                  fit={scoreModel(model, profile)}
                  downloaded={isCatalogModelDownloaded(model.id, downloadedIds)}
                  effectiveMemoryGB={effective.totalGB}
                  effectiveSource={effective.source}
                  onDownload={(modelId) => {
                    void startDownload(modelId);
                    router.push('/models');
                  }}
                  onUseInPanel={(modelId) => {
                    addPanel({
                      modelId: resolveInstalledModelId(modelId, ollamaModels),
                      provider: 'ollama'
                    });
                    router.push('/');
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-base font-semibold text-blue-300">Will run well</h2>
          {capableModels.length === 0 ? (
            <p className="text-sm text-zinc-500">No capable models for the selected filters.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {capableModels.map((model) => (
                <RecommendedModelCard
                  key={model.id}
                  model={model}
                  fit={scoreModel(model, profile)}
                  downloaded={isCatalogModelDownloaded(model.id, downloadedIds)}
                  effectiveMemoryGB={effective.totalGB}
                  effectiveSource={effective.source}
                  onDownload={(modelId) => {
                    void startDownload(modelId);
                    router.push('/models');
                  }}
                  onUseInPanel={(modelId) => {
                    addPanel({
                      modelId: resolveInstalledModelId(modelId, ollamaModels),
                      provider: 'ollama'
                    });
                    router.push('/');
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 border border-zinc-800 bg-zinc-900 p-4">
          <button
            type="button"
            onClick={() => setShowSlow((previous) => !previous)}
            className="text-base font-semibold text-amber-300"
          >
            Show {slowModels.length} slower models {showSlow ? '▴' : '▾'}
          </button>

          {showSlow ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {slowModels.map((model) => (
                <RecommendedModelCard
                  key={model.id}
                  model={model}
                  fit={scoreModel(model, profile)}
                  downloaded={isCatalogModelDownloaded(model.id, downloadedIds)}
                  effectiveMemoryGB={effective.totalGB}
                  effectiveSource={effective.source}
                  onDownload={(modelId) => {
                    void startDownload(modelId);
                    router.push('/models');
                  }}
                  onUseInPanel={(modelId) => {
                    addPanel({
                      modelId: resolveInstalledModelId(modelId, ollamaModels),
                      provider: 'ollama'
                    });
                    router.push('/');
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3 border border-zinc-800 bg-zinc-900 p-4">
          <button
            type="button"
            onClick={() => setShowIncompatible((previous) => !previous)}
            className="text-base font-semibold text-red-300"
          >
            Show {incompatibleModels.length} incompatible models {showIncompatible ? '▴' : '▾'}
          </button>

          {showIncompatible ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {incompatibleModels.map((model) => (
                <RecommendedModelCard
                  key={model.id}
                  model={model}
                  fit={scoreModel(model, profile)}
                  downloaded={isCatalogModelDownloaded(model.id, downloadedIds)}
                  effectiveMemoryGB={effective.totalGB}
                  effectiveSource={effective.source}
                  onDownload={(modelId) => {
                    void startDownload(modelId);
                    router.push('/models');
                  }}
                  onUseInPanel={(modelId) => {
                    addPanel({
                      modelId: resolveInstalledModelId(modelId, ollamaModels),
                      provider: 'ollama'
                    });
                    router.push('/');
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
