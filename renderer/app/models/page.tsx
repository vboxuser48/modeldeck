'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, Library, DownloadCloud, Sparkles, HardDrive, SearchCode } from 'lucide-react';
import DownloadProgressCard from '@/components/models/DownloadProgressCard';
import ModelCard from '@/components/models/ModelCard';
import { Button, Input } from '@/components/ui';
import {
  MODEL_CATALOG,
  getCatalogModelForInstalledId,
  isCatalogModelDownloaded,
  resolveInstalledModelId
} from '@/lib/modelCatalog';
import { useDownloadsStore } from '@/store/downloads';
import { useModelsStore } from '@/store/models';
import { useWorkspaceStore } from '@/store/workspace';
import type { ModelTag } from '@/types/model';

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

/**
 * Model discovery and download management page.
 */
export default function ModelsPage(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<ModelTag>>(new Set());
  const [customModelId, setCustomModelId] = useState('');

  const ollamaModels = useModelsStore((state) => state.ollamaModels);
  const refreshOllamaModels = useModelsStore((state) => state.refreshOllamaModels);

  const downloads = useDownloadsStore((state) => state.downloads);
  const startDownload = useDownloadsStore((state) => state.startDownload);
  const installOllamaAndResume = useDownloadsStore((state) => state.installOllamaAndResume);
  const cancelDownload = useDownloadsStore((state) => state.cancelDownload);
  const registerPullListeners = useDownloadsStore((state) => state.registerPullListeners);
  const unregisterPullListeners = useDownloadsStore((state) => state.unregisterPullListeners);

  const addPanel = useWorkspaceStore((state) => state.addPanel);

  useEffect(() => {
    void refreshOllamaModels();
    registerPullListeners();

    return () => {
      unregisterPullListeners();
    };
  }, [refreshOllamaModels, registerPullListeners, unregisterPullListeners]);

  const downloadedIds = useMemo(() => new Set(ollamaModels.map((model) => model.id)), [ollamaModels]);

  const activeDownloadEntries = useMemo(
    () =>
      Array.from(downloads.values())
        .filter((entry) => entry.status === 'queued' || entry.status === 'downloading')
        .sort((left, right) => right.startedAt - left.startedAt),
    [downloads]
  );

  const activeDownloadIds = useMemo(
    () => new Set(activeDownloadEntries.map((entry) => entry.model)),
    [activeDownloadEntries]
  );

  const downloadedModels = useMemo(
    () => MODEL_CATALOG.filter((model) => isCatalogModelDownloaded(model.id, downloadedIds)),
    [downloadedIds]
  );

  const availableModels = useMemo(() => {
    const query = search.trim().toLowerCase();

    return MODEL_CATALOG.filter((model) => {
      if (isCatalogModelDownloaded(model.id, downloadedIds) || activeDownloadIds.has(model.id)) {
        return false;
      }

      const passesTagFilter =
        activeTags.size === 0 || Array.from(activeTags).every((tag) => model.tags.includes(tag));
      if (!passesTagFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        model.name,
        model.family,
        model.publisher,
        model.tags.join(' ')
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeDownloadIds, activeTags, downloadedIds, search]);

  const uncatalogedDownloadedModels = useMemo(
    () => ollamaModels.filter((installed) => !getCatalogModelForInstalledId(installed.id)),
    [ollamaModels]
  );

  const trimmedCustomModelId = customModelId.trim();
  const customAlreadyDownloaded = Boolean(
    trimmedCustomModelId &&
      ollamaModels.some((model) => model.id.toLowerCase() === trimmedCustomModelId.toLowerCase())
  );
  const customDownloading = Boolean(trimmedCustomModelId && downloads.get(trimmedCustomModelId));

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-8 pt-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Model Library</h1>
              <p className="text-[13px] text-zinc-400 mt-0.5">Discover, download, and manage your local AI models.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 md:mt-0">
            <Link 
              href="/models/recommend" 
              className="flex items-center gap-2 rounded-xl bg-indigo-500/10 px-4 py-2 text-[13px] font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20"
            >
              <Sparkles className="h-4 w-4" />
              Recommendations
            </Link>
            <Link 
              href="/" 
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              Workspace
            </Link>
          </div>
        </header>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 rounded-3xl border border-zinc-800/60 bg-zinc-900/30 p-6 backdrop-blur-sm shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by model, family, publisher, or tag..."
              className="h-12 w-full rounded-2xl border-zinc-800 bg-zinc-950/50 pl-11 text-[15px] placeholder:text-zinc-500 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {FILTER_TAGS.map((tag) => {
              const selected = activeTags.has(tag);
              return (
                <button
                  key={tag}
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
                  className={[
                    'rounded-xl px-4 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-all duration-200',
                    selected
                      ? 'bg-zinc-100 text-zinc-900 shadow-sm'
                      : 'border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  ].join(' ')}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-zinc-800/60 pt-5">
            <div className="flex items-center gap-2">
               <DownloadCloud className="h-4 w-4 text-zinc-500" />
               <p className="text-[13px] font-medium text-zinc-300">Pull custom Ollama tag</p>
            </div>
            
            <div className="flex w-full md:w-auto items-center gap-2">
              <Input
                value={customModelId}
                onChange={(event) => setCustomModelId(event.target.value)}
                placeholder="e.g. gemma4:31b"
                className="h-10 w-full md:w-64 rounded-xl border-zinc-800 bg-zinc-950/50 px-3 text-sm focus-visible:ring-1"
              />
              <Button
                className="h-10 rounded-xl px-5 text-sm"
                onClick={() => {
                  if (!trimmedCustomModelId) return;
                  void startDownload(trimmedCustomModelId);
                  setCustomModelId('');
                }}
                disabled={!trimmedCustomModelId || customAlreadyDownloaded || customDownloading}
              >
                Pull Model
              </Button>
            </div>
          </div>
          {customAlreadyDownloaded ? (
            <p className="px-1 text-xs text-emerald-400">That model is already downloaded.</p>
          ) : null}
        </div>

        {/* sections */}
        
        {activeDownloadEntries.length > 0 ? (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-400 ml-2">
              <DownloadCloud className="h-4 w-4" /> Active Downloads ({activeDownloadEntries.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activeDownloadEntries.map((entry) => (
                <DownloadProgressCard
                  key={entry.model}
                  entry={entry}
                  onCancel={(modelId) => {
                    void cancelDownload(modelId);
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        {downloadedModels.length > 0 && (
          <section className="space-y-4 mt-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-emerald-400 ml-2">
              <HardDrive className="h-4 w-4" /> Installed Catalog ({downloadedModels.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {downloadedModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  downloaded
                  downloadEntry={downloads.get(model.id)}
                  onDownload={(modelId) => void startDownload(modelId)}
                  onInstallOllama={(modelId) => void installOllamaAndResume(modelId)}
                  onCancel={(modelId) => void cancelDownload(modelId)}
                  onDelete={async (modelId) => {
                    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
                    if (!bridge) return;
                    await bridge.ollama.deleteModel(modelId);
                    await refreshOllamaModels();
                  }}
                  onUseInPanel={(modelId) => {
                    addPanel({
                      modelId: resolveInstalledModelId(modelId, ollamaModels),
                      provider: 'ollama'
                    });
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {uncatalogedDownloadedModels.length > 0 && (
          <section className="space-y-4 mt-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400 ml-2">
              <SearchCode className="h-4 w-4" /> Other Installed Models ({uncatalogedDownloadedModels.length})
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {uncatalogedDownloadedModels.map((model) => (
                <li
                  key={model.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 px-5 py-4 shadow-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-medium text-zinc-200">{model.name}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500 font-mono bg-zinc-950 inline-block px-2 py-0.5 rounded border border-zinc-800">{model.id}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      className="flex-1 sm:flex-none text-xs rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                      onClick={() => addPanel({ modelId: model.id, provider: 'ollama' })}
                    >
                      Use Model
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs rounded-xl border-zinc-700/50 hover:bg-red-500/10 hover:text-red-400"
                      onClick={async () => {
                        const confirm = window.confirm(`Delete ${model.name}?`);
                        if (!confirm) return;
                        const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
                        if (!bridge) return;
                        await bridge.ollama.deleteModel(model.id);
                        await refreshOllamaModels();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="space-y-4 mt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-zinc-400 ml-2">
            <Library className="h-4 w-4" /> Available Models ({availableModels.length})
          </h2>
          {availableModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-zinc-800/50 rounded-3xl bg-zinc-900/30">
              <Search className="h-8 w-8 text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-300">No models found</p>
              <p className="text-[13px] text-zinc-500 mt-1">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {availableModels.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  downloaded={false}
                  downloadEntry={downloads.get(model.id)}
                  onDownload={(modelId) => void startDownload(modelId)}
                  onInstallOllama={(modelId) => void installOllamaAndResume(modelId)}
                  onCancel={(modelId) => void cancelDownload(modelId)}
                  onDelete={async () => {}}
                  onUseInPanel={(modelId) => addPanel({ modelId, provider: 'ollama' })}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
