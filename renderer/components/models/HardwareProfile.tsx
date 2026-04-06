'use client';

import { getEffectiveMemoryGB } from '@/lib/hardware';
import type { HardwareProfile } from '@/types/ipc';

interface HardwareProfileCardProps {
  profile: HardwareProfile;
}

function percentUsed(totalBytes: number, freeBytes: number): number {
  if (totalBytes <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, ((totalBytes - freeBytes) / totalBytes) * 100));
}

/**
 * Summarizes detected hardware and inference memory basis.
 */
export default function HardwareProfileCard({ profile }: HardwareProfileCardProps): React.JSX.Element {
  const ramUsedPercent = percentUsed(profile.ram.totalBytes, profile.ram.freeBytes);
  const effective = getEffectiveMemoryGB(profile);

  return (
    <section className="border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-lg font-semibold">Your Hardware</h2>

      <div className="mt-4 space-y-4 text-sm text-zinc-300">
        <div>
          <p className="text-zinc-100">CPU</p>
          <p className="text-zinc-400">
            {profile.cpu.model} | {profile.cpu.cores} cores | {profile.cpu.arch}
          </p>
        </div>

        <div>
          <p className="text-zinc-100">RAM</p>
          <p className="text-zinc-400">
            {profile.ram.totalGB.toFixed(1)} GB total | {profile.ram.freeGB.toFixed(1)} GB free
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-800">
            <div className="h-full bg-zinc-300" style={{ width: `${ramUsedPercent.toFixed(1)}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{ramUsedPercent.toFixed(0)}% used</p>
        </div>

        <div>
          <p className="text-zinc-100">GPU</p>
          <p className="text-zinc-400">{profile.vram.gpuName}</p>
          <p className="text-zinc-400">
            VRAM: {profile.vram.totalGB.toFixed(1)} GB | {profile.vram.backend.toUpperCase()}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-800">
            <div
              className="h-full bg-indigo-500"
              style={{ width: profile.vram.detected ? '100%' : '0%' }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{profile.vram.detected ? 'detected' : 'not detected'}</p>
        </div>

        <div className="border-t border-zinc-800 pt-3">
          <p className="text-zinc-100">Inference Memory</p>
          <p className="text-zinc-400">
            Using {effective.source.toUpperCase()} ({effective.totalGB.toFixed(1)} GB) for model inference.
          </p>
          <p className="text-zinc-500">RAM fallback available: {profile.ram.freeGB.toFixed(1)} GB free.</p>
        </div>

        {!profile.vram.detected ? (
          <p className="rounded border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-400">
            GPU VRAM could not be detected. Recommendations are based on your system RAM ({profile.ram.freeGB.toFixed(1)}
            GB free). A dedicated GPU will significantly improve performance.
          </p>
        ) : null}
      </div>
    </section>
  );
}
