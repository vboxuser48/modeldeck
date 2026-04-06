'use client';

import { Badge, Button } from '@/components/ui';
import { getModelMemoryRequirements } from '@/lib/modelCatalog';
import type { CatalogModel } from '@/types/model';

type FitTier = 'ideal' | 'capable' | 'slow' | 'incompatible';

interface RecommendedModelCardProps {
  model: CatalogModel;
  fit: FitTier;
  downloaded: boolean;
  effectiveMemoryGB: number;
  effectiveSource: 'vram' | 'ram';
  onDownload: (modelId: string) => void;
  onUseInPanel: (modelId: string) => void;
}

function fitBadge(fit: FitTier): { label: string; className: string; barClass: string } {
  if (fit === 'ideal') {
    return {
      label: 'Ideal',
      className: 'border-emerald-700 bg-emerald-950 text-emerald-300',
      barClass: 'bg-emerald-500'
    };
  }
  if (fit === 'capable') {
    return {
      label: 'Capable',
      className: 'border-blue-700 bg-blue-950 text-blue-300',
      barClass: 'bg-blue-500'
    };
  }
  if (fit === 'slow') {
    return {
      label: 'Slow',
      className: 'border-amber-700 bg-amber-950 text-amber-300',
      barClass: 'bg-amber-500'
    };
  }

  return {
    label: 'Too large',
    className: 'border-red-700 bg-red-950 text-red-300',
    barClass: 'bg-red-500'
  };
}

function formatParams(value: number): string {
  return value >= 1 ? `${value}B` : `${(value * 1000).toFixed(0)}M`;
}

/**
 * Card variant for recommendation tiers with memory fit visualization.
 */
export default function RecommendedModelCard({
  model,
  fit,
  downloaded,
  effectiveMemoryGB,
  effectiveSource,
  onDownload,
  onUseInPanel
}: RecommendedModelCardProps): React.JSX.Element {
  const badge = fitBadge(fit);
  const requirements = getModelMemoryRequirements(model);
  const requiredForSource = effectiveSource === 'vram' ? requirements.gpuVramRequiredGB : requirements.cpuRamRequiredGB;
  const ratio = Math.min(100, Math.max(0, (requiredForSource / Math.max(effectiveMemoryGB, 0.1)) * 100));

  return (
    <article
      className={[
        'border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-600',
        fit === 'slow' ? 'opacity-60' : ''
      ].join(' ')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-zinc-100">{model.name}</h3>
          <p className="text-xs text-zinc-400">{model.publisher}</p>
        </div>
        <Badge
          className={badge.className}
          title={fit === 'slow' ? 'This model may use CPU offload and run at reduced speed on your hardware.' : undefined}
        >
          {badge.label}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
        <p>Params: {formatParams(model.paramsBillion)}</p>
        <p>Disk: {model.diskGB.toFixed(1)} GB</p>
        <p>CPU RAM: {requirements.cpuRamRequiredGB.toFixed(1)} GB</p>
        <p>GPU VRAM: {requirements.gpuVramRequiredGB.toFixed(1)} GB</p>
        <p>Context: {Math.round(model.contextLength / 1000)}K ctx</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {model.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded bg-zinc-800">
          <div className={`h-full ${badge.barClass}`} style={{ width: `${ratio}%` }} />
        </div>
        <p className="mt-1 text-xs text-zinc-400">
          {requiredForSource.toFixed(1)} GB needed / {effectiveMemoryGB.toFixed(1)} GB {effectiveSource.toUpperCase()}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {downloaded ? (
          <>
            <Badge variant="success">Already downloaded</Badge>
            <Button onClick={() => onUseInPanel(model.id)}>Use in Panel</Button>
          </>
        ) : (
          <Button onClick={() => onDownload(model.id)}>Download</Button>
        )}
      </div>
    </article>
  );
}
