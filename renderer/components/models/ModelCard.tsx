import { useEffect, useMemo, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { getModelMemoryRequirements } from '@/lib/modelCatalog';
import type { CatalogModel } from '@/types/model';
import type { DownloadEntry } from '@/store/downloads';
import { HardDrive, Server, Zap } from 'lucide-react';

interface ModelCardProps {
  model: CatalogModel;
  downloaded: boolean;
  downloadEntry?: DownloadEntry;
  onDownload: (modelId: string) => void;
  onInstallOllama: (modelId: string) => void;
  onCancel: (modelId: string) => void;
  onDelete: (modelId: string) => Promise<void>;
  onUseInPanel: (modelId: string) => void;
}

type PerformanceLevel = 'low' | 'medium' | 'high';

const TAG_EXPLANATIONS: Record<string, string> = {
  coding: 'Optimized for code generation, refactoring, and technical tasks.',
  chat: 'Good default for natural conversations and assistant-style responses.',
  reasoning: 'Better at multi-step logic, planning, and analytical prompts.',
  multilingual: 'Handles multiple languages with stronger comprehension and output quality.',
  fast: 'Designed for lower latency and quicker response times.',
  large: 'Higher-capacity model, often stronger quality with higher hardware cost.',
  vision: 'Supports visual or multimodal workflows in compatible runtimes.',
  embedding: 'Best for vectorization, retrieval, and semantic search tasks.'
};

function formatBytes(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '--';
  }

  const gb = value / 1024 ** 3;
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }

  const mb = value / 1024 ** 2;
  return `${mb.toFixed(0)} MB`;
}

function formatParams(value: number): string {
  return value >= 1 ? `${value}B` : `${(value * 1000).toFixed(0)}M`;
}

function levelToLabel(level: PerformanceLevel): string {
  if (level === 'high') {
    return 'high';
  }

  if (level === 'medium') {
    return 'medium';
  }

  return 'low';
}

function levelToSegments(level: PerformanceLevel): number {
  if (level === 'high') {
    return 3;
  }

  if (level === 'medium') {
    return 2;
  }

  return 1;
}

function computeSpeedLevel(model: CatalogModel): PerformanceLevel {
  if (model.tags.includes('fast') || model.paramsBillion <= 4) {
    return 'high';
  }

  if (model.paramsBillion <= 12) {
    return 'medium';
  }

  return 'low';
}

function computeQualityLevel(model: CatalogModel): PerformanceLevel {
  if (model.tags.includes('reasoning') || model.tags.includes('coding') || model.paramsBillion >= 14) {
    return 'high';
  }

  if (model.paramsBillion >= 7 || model.tags.includes('chat')) {
    return 'medium';
  }

  return 'low';
}

function computeMemoryLevel(model: CatalogModel): PerformanceLevel {
  const memoryTarget = model.gpuVramRequiredGB ?? model.ramRequiredGB;
  if (memoryTarget <= 8) {
    return 'high';
  }

  if (memoryTarget <= 16) {
    return 'medium';
  }

  return 'low';
}

function buildWhyChoose(model: CatalogModel): string {
  if (model.tags.includes('coding') && model.tags.includes('fast')) {
    return 'Great coding-first choice when you want fast iteration on a laptop-class setup.';
  }

  if (model.tags.includes('coding')) {
    return 'Strong pick for software development tasks like generation, refactor, and debugging.';
  }

  if (model.tags.includes('chat') && model.tags.includes('fast')) {
    return 'Best suited for responsive day-to-day chat assistance with lower latency.';
  }

  if (model.tags.includes('reasoning')) {
    return 'Recommended when you need deeper multi-step reasoning and better answer quality.';
  }

  if (model.tags.includes('multilingual')) {
    return 'Good fit for multilingual workflows and cross-language communication tasks.';
  }

  return 'Balanced general-purpose option for everyday local AI usage.';
}

function PerformanceRow({
  label,
  level,
  helpText,
  invert = false
}: {
  label: string;
  level: PerformanceLevel;
  helpText: string;
  invert?: boolean;
}): React.JSX.Element {
  const filled = invert ? 4 - levelToSegments(level) : levelToSegments(level);

  return (
    <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-300" title={helpText}>
      <span className="text-zinc-400 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={`${label}-${index}`}
              className={[
                'h-1.5 w-4 rounded-sm transition-colors',
                index < filled ? 'bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-zinc-800'
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a catalog model card with state-aware actions.
 */
export default function ModelCard({
  model,
  downloaded,
  downloadEntry,
  onDownload,
  onInstallOllama,
  onCancel,
  onDelete,
  onUseInPanel
}: ModelCardProps): React.JSX.Element {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!confirmingDelete) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setConfirmingDelete(false);
    }, 4000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [confirmingDelete]);

  const isQueued = downloadEntry?.status === 'queued';
  const isDownloading = downloadEntry?.status === 'downloading';
  const progressPercent = useMemo(() => {
    if (downloadEntry?.percent === null || typeof downloadEntry?.percent === 'undefined') {
      return 20;
    }
    return Math.max(0, Math.min(100, downloadEntry.percent));
  }, [downloadEntry?.percent]);
  const installCommand = downloadEntry?.installCommand ?? 'curl -fsSL https://ollama.com/install.sh | sh';
  const requirements = getModelMemoryRequirements(model);
  const speedLevel = computeSpeedLevel(model);
  const qualityLevel = computeQualityLevel(model);
  const memoryLevel = computeMemoryLevel(model);
  const whyChooseText = buildWhyChoose(model);
  const lowMemory = (model.gpuVramRequiredGB ?? model.ramRequiredGB) <= 8;
  const bestForCoding = model.tags.includes('coding');
  const bestForChat = model.tags.includes('chat') && !model.tags.includes('large');

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-5 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700/80 hover:shadow-xl hover:bg-zinc-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="truncate text-[15px] font-semibold text-zinc-100">{model.name}</h3>
            {downloaded ? <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Downloaded</Badge> : null}
            {isQueued ? <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Queued</Badge> : null}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="font-medium text-zinc-400">{model.publisher}</span>
            <span>•</span>
            <span className="uppercase tracking-wider">{model.family}</span>
            <span>•</span>
            <span className="font-medium text-zinc-300">{formatParams(model.paramsBillion)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-[13px] leading-relaxed text-zinc-400 min-h-[40px]">
        {model.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {bestForCoding ? <Badge className="rounded-md border border-blue-900/50 bg-blue-500/10 text-[10px] text-blue-400">Best for coding</Badge> : null}
        {bestForChat ? <Badge className="rounded-md border border-emerald-900/50 bg-emerald-500/10 text-[10px] text-emerald-400">Best for chat</Badge> : null}
        {lowMemory ? <Badge className="rounded-md border border-amber-900/50 bg-amber-500/10 text-[10px] text-amber-400">Low memory</Badge> : null}
        {model.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400"
            title={TAG_EXPLANATIONS[tag] ?? tag}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Hardware</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
              <HardDrive className="h-3.5 w-3.5 text-zinc-500" />
              <span>{model.diskGB.toFixed(1)} GB Disk</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
              <Server className="h-3.5 w-3.5 text-zinc-500" />
              <span>{requirements.cpuRamRequiredGB.toFixed(1)} GB RAM</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-300">
              <Zap className="h-3.5 w-3.5 text-amber-400/80" />
              <span>{requirements.gpuVramRequiredGB.toFixed(1)} GB VRAM</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Assessment</p>
          <div className="flex flex-col gap-2 justify-center h-full pb-1">
            <PerformanceRow
              label="Speed"
              level={speedLevel}
              helpText="Higher speed generally means faster response latency."
            />
            <PerformanceRow
              label="Quality"
              level={qualityLevel}
              helpText="Higher quality generally means stronger reasoning and output quality."
            />
            <PerformanceRow
              label="Efficiency"
              level={memoryLevel}
              invert
              helpText="Higher here means lighter memory requirement for your machine."
            />
          </div>
        </div>
      </div>

      {isDownloading ? (
        <div className="mt-5 rounded-xl border border-indigo-900/30 bg-indigo-950/20 p-3 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[11px] font-medium text-indigo-300">{downloadEntry?.statusText ?? 'Downloading...'}</p>
            <p className="text-[11px] tabular-nums text-indigo-400/80">
              {formatBytes(downloadEntry?.doneBytes ?? null)} / {formatBytes(downloadEntry?.totalBytes ?? null)}
            </p>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-300 ease-out"
              style={{ width: downloadEntry?.percent === null ? '20%' : `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : isQueued ? (
        <div className="mt-5 rounded-xl border border-amber-900/30 bg-amber-950/20 p-3 backdrop-blur-sm">
          <p className="text-xs text-amber-400/80">{downloadEntry?.statusText ?? 'Queued for download...'}</p>
        </div>
      ) : <div className="mt-auto pt-5" />}

      <div className="mt-auto pt-4 flex flex-wrap gap-2 border-t border-zinc-800/60 w-full pt-4">
        {downloaded ? (
          <>
            <Button className="flex-1 rounded-xl shadow-sm font-medium" onClick={() => onUseInPanel(model.id)}>Use Model</Button>
            {!confirmingDelete ? (
              <Button variant="outline" className="rounded-xl px-3 bg-zinc-900 border-zinc-700/50 hover:bg-zinc-800 hover:text-red-400" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            ) : (
              <div className="flex gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                <Button className="flex-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" onClick={() => void onDelete(model.id)}>
                  Confirm Delete
                </Button>
                <Button variant="outline" className="rounded-xl px-3 border-zinc-700/50" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : isDownloading || isQueued ? (
          <Button variant="outline" className="w-full rounded-xl border border-red-900/30 text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors" onClick={() => onCancel(model.id)}>
            Cancel Download
          </Button>
        ) : (
          <Button className="w-full rounded-xl shadow-sm font-medium border border-zinc-700/80 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-zinc-200 text-zinc-900" onClick={() => onDownload(model.id)}>
            Download ({model.diskGB.toFixed(1)} GB)
          </Button>
        )}
      </div>

      {downloadEntry?.status === 'error' && downloadEntry.error ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-red-400">{downloadEntry.error}</p>
          {downloadEntry.errorCode === 'OLLAMA_NOT_INSTALLED' ? (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-3">
              <p className="text-[11px] font-medium text-zinc-300">Install command:</p>
              <p className="mt-1 break-all rounded-md bg-black/40 px-2 py-1.5 font-mono text-[11px] text-zinc-400">{installCommand}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="rounded-lg px-3 py-1 text-[11px]"
                  onClick={() => {
                    onInstallOllama(model.id);
                  }}
                >
                  Install Ollama
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg px-3 py-1 text-[11px]"
                  onClick={() => {
                    void navigator.clipboard.writeText(installCommand);
                  }}
                >
                  Copy Command
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
