'use client';

import { Button } from '@/components/ui';
import type { DownloadEntry } from '@/store/downloads';

interface DownloadProgressCardProps {
  entry: DownloadEntry;
  onCancel: (model: string) => void;
}

function formatBytes(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return '--';
  }

  const gb = value / 1024 ** 3;
  if (gb >= 1) {
    return `${gb.toFixed(1)} GB`;
  }

  return `${(value / 1024 ** 2).toFixed(0)} MB`;
}

function parseBytesToken(token: string): number | null {
  const match = token.trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) {
    return null;
  }

  const value = Number.parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const factors: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4
  };

  const factor = factors[unit];
  return Number.isFinite(value) && factor ? value * factor : null;
}

interface ParsedStatus {
  phase: string;
  speed?: string;
  eta?: string;
  doneBytes: number | null;
  totalBytes: number | null;
}

function parseStatusText(entry: DownloadEntry): ParsedStatus {
  const cleaned = (entry.statusText ?? '').replace(/\s+/g, ' ').trim();
  const speedMatch = cleaned.match(/\b\d+(?:\.\d+)?\s*(?:KB|MB|GB|TB)\/s\b/i);
  const etaMatch = cleaned.match(/\b\d+h\d+m\d+s\b|\b\d+m\d+s\b|\b\d+s\b/i);
  const sizeMatch = cleaned.match(/(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB|TB))\/(\d+(?:\.\d+)?\s*(?:B|KB|MB|GB|TB))/i);

  let phase = cleaned;
  if (speedMatch) {
    phase = phase.replace(speedMatch[0], '').trim();
  }
  if (etaMatch) {
    phase = phase.replace(etaMatch[0], '').trim();
  }
  if (sizeMatch) {
    phase = phase.replace(sizeMatch[0], '').trim();
  }

  phase = phase
    .replace(/pulling\s+[a-f0-9]{12,}:?/i, 'Pulling')
    .replace(/\s+/g, ' ')
    .replace(/^[,:\-\s]+|[,:\-\s]+$/g, '');

  return {
    phase: phase || 'Downloading model',
    speed: speedMatch?.[0],
    eta: etaMatch?.[0],
    doneBytes: entry.doneBytes ?? (sizeMatch ? parseBytesToken(sizeMatch[1]) : null),
    totalBytes: entry.totalBytes ?? (sizeMatch ? parseBytesToken(sizeMatch[2]) : null)
  };
}

/**
 * Compact active-download card for the downloads section.
 */
export default function DownloadProgressCard({
  entry,
  onCancel
}: DownloadProgressCardProps): React.JSX.Element {
  const width = entry.percent === null ? 20 : Math.max(0, Math.min(100, entry.percent));
  const parsed = parseStatusText(entry);
  const percentLabel = `${Math.round(width)}%`;

  return (
    <article className="border border-zinc-800 bg-zinc-900 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="truncate text-sm font-medium text-zinc-100">{entry.model}</h4>
        <Button variant="outline" className="px-2 py-1 text-xs" onClick={() => onCancel(entry.model)}>
          Cancel
        </Button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <p className="truncate text-zinc-300">{parsed.phase}</p>
        <span className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
          {percentLabel}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-800">
        <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${width}%` }} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-zinc-400">
        <p className="font-mono text-zinc-300">
          {formatBytes(parsed.doneBytes)} / {formatBytes(parsed.totalBytes)}
        </p>
        <p className="text-right font-mono text-zinc-400">{parsed.speed ?? '--'}</p>
        <p className="truncate text-zinc-500">Status: {entry.status}</p>
        <p className="text-right font-mono text-zinc-500">ETA: {parsed.eta ?? '--'}</p>
      </div>
    </article>
  );
}
