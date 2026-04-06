import os from 'node:os';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { ipcMain } from 'electron';
import type { ApiResponse, CpuRamSnapshot, HardwareProfile } from '../../renderer/types/ipc.js';

interface CpuSnapshot {
  idle: number;
  total: number;
}

let previousCpuSnapshot: CpuSnapshot | null = null;
let cachedHardwareProfile: HardwareProfile | null = null;
let cachedHardwareProfileAt = 0;
let cachedGpuPercent: number | null = null;
let cachedGpuPercentAt = 0;

const BYTES_PER_GB = 1024 ** 3;
const HARDWARE_PROFILE_CACHE_MS = 3 * 60 * 1000;
const GPU_USAGE_CACHE_MS = 5000;
const SHELL_PROBE_TIMEOUT_MS = 1500;

interface VramInfo {
  detected: boolean;
  totalBytes: number;
  totalGB: number;
  gpuName: string;
  backend: 'cuda' | 'rocm' | 'metal' | 'none';
}

interface WmicGpuRecord {
  name: string;
  adapterRamBytes: number;
}

interface MacDisplayEntry {
  spsdisplays_ndrvs?: Array<{
    _name?: string;
    spdisplays_vram?: string;
    spdisplays_vram_shared?: string;
  }>;
}

interface MacDisplaysResult {
  SPDisplaysDataType?: MacDisplayEntry[];
}

/**
 * Samples aggregate CPU idle and total time across all cores.
 */
function sampleCpu(): CpuSnapshot {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }

  return { idle, total };
}

/**
 * Calculates CPU usage percentage since the previous snapshot.
 */
function calculateCpuPercent(): number {
  const current = sampleCpu();

  if (!previousCpuSnapshot) {
    previousCpuSnapshot = current;
    const busyRatio = current.total > 0 ? (current.total - current.idle) / current.total : 0;
    return Number((busyRatio * 100).toFixed(1));
  }

  const totalDelta = current.total - previousCpuSnapshot.total;
  const idleDelta = current.idle - previousCpuSnapshot.idle;
  previousCpuSnapshot = current;

  if (totalDelta <= 0) {
    return 0;
  }

  const usage = ((totalDelta - idleDelta) / totalDelta) * 100;
  return Number(Math.max(0, Math.min(100, usage)).toFixed(1));
}

/**
 * Rounds a bytes value into GB with 1 decimal place.
 */
function toGB(bytes: number): number {
  return Number((bytes / BYTES_PER_GB).toFixed(1));
}

/**
 * Returns true when a command exists in PATH.
 */
function hasCommand(command: string): boolean {
  try {
    const probe = process.platform === 'win32' ? `where ${command}` : `command -v ${command}`;
    execSync(probe, { stdio: 'ignore', timeout: SHELL_PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses VRAM strings like "8 GB" or "1536 MB".
 */
function parseMemoryTextToBytes(value: string): number {
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*(gb|gib|mb|mib|kb|kib|b)/);
  if (!match) {
    return 0;
  }

  const amount = Number.parseFloat(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (unit === 'gb' || unit === 'gib') {
    return Math.round(amount * BYTES_PER_GB);
  }
  if (unit === 'mb' || unit === 'mib') {
    return Math.round(amount * 1024 * 1024);
  }
  if (unit === 'kb' || unit === 'kib') {
    return Math.round(amount * 1024);
  }

  return Math.round(amount);
}

/**
 * Builds a default VRAM fallback payload.
 */
function getNoVramDetected(): VramInfo {
  return {
    detected: false,
    totalBytes: 0,
    totalGB: 0,
    gpuName: 'Unknown',
    backend: 'none'
  };
}

/**
 * Detects GPU utilization percentage where available (currently NVIDIA).
 */
function detectGpuUsagePercent(): number | null {
  const now = Date.now();
  if (now - cachedGpuPercentAt < GPU_USAGE_CACHE_MS) {
    return cachedGpuPercent;
  }

  try {
    if (!hasCommand('nvidia-smi')) {
      cachedGpuPercent = null;
      cachedGpuPercentAt = now;
      return null;
    }

    const output = execSync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', {
      encoding: 'utf8',
      timeout: SHELL_PROBE_TIMEOUT_MS
    });

    const firstLine = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!firstLine) {
      cachedGpuPercent = null;
      cachedGpuPercentAt = now;
      return null;
    }

    const parsed = Number.parseFloat(firstLine.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsed)) {
      cachedGpuPercent = null;
      cachedGpuPercentAt = now;
      return null;
    }

    const clamped = Math.max(0, Math.min(100, parsed));
    cachedGpuPercent = Number(clamped.toFixed(1));
    cachedGpuPercentAt = now;
    return cachedGpuPercent;
  } catch {
    cachedGpuPercent = null;
    cachedGpuPercentAt = now;
    return null;
  }
}

/**
 * Detects VRAM memory usage where supported (currently NVIDIA).
 */
function detectGpuMemoryUsageMb(): number | null {
  try {
    if (!hasCommand('nvidia-smi')) {
      return null;
    }

    const output = execSync('nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits', {
      encoding: 'utf8',
      timeout: SHELL_PROBE_TIMEOUT_MS
    });

    const firstLine = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

    if (!firstLine) {
      return null;
    }

    const parsed = Number.parseFloat(firstLine.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? Number(parsed.toFixed(1)) : null;
  } catch {
    return null;
  }
}

/**
 * Detects VRAM on Windows via WMIC and backend probes.
 */
function detectWindowsVram(): VramInfo {
  const noVram = getNoVramDetected();

  try {
    const output = execSync('wmic path win32_VideoController get AdapterRAM,Name /format:csv', {
      encoding: 'utf8',
      timeout: SHELL_PROBE_TIMEOUT_MS
    });

    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('Node,'));

    const records: WmicGpuRecord[] = lines
      .map((line) => {
        const [node, adapterRamRaw, ...nameParts] = line.split(',');
        void node;
        const name = nameParts.join(',').trim();
        const adapterRamBytes = Number.parseInt(adapterRamRaw?.trim() ?? '0', 10);
        return {
          name,
          adapterRamBytes: Number.isFinite(adapterRamBytes) ? adapterRamBytes : 0
        };
      })
      .filter((record) => record.name.length > 0 && record.adapterRamBytes > 0);

    if (records.length === 0) {
      return noVram;
    }

    const best = records.reduce((largest, current) =>
      current.adapterRamBytes > largest.adapterRamBytes ? current : largest
    );

    const backend: VramInfo['backend'] = hasCommand('nvidia-smi')
      ? 'cuda'
      : hasCommand('rocminfo')
        ? 'rocm'
        : 'none';

    return {
      detected: true,
      totalBytes: best.adapterRamBytes,
      totalGB: toGB(best.adapterRamBytes),
      gpuName: best.name,
      backend
    };
  } catch {
    return noVram;
  }
}

/**
 * Detects VRAM on Linux via NVIDIA CLI, AMD sysfs, then rocm-smi.
 */
function detectLinuxVram(): VramInfo {
  const noVram = getNoVramDetected();

  try {
    const output = execSync(
      'nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits',
      {
        encoding: 'utf8',
        timeout: SHELL_PROBE_TIMEOUT_MS
      }
    );

    const rows = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const [namePart, memoryPart] = line.split(',').map((part) => part.trim());
        const memoryMiB = Number.parseInt(memoryPart ?? '0', 10);
        return {
          name: namePart,
          bytes: Number.isFinite(memoryMiB) && memoryMiB > 0 ? memoryMiB * 1024 * 1024 : 0
        };
      })
      .filter((entry) => entry.name.length > 0 && entry.bytes > 0);

    if (rows.length > 0) {
      const best = rows.reduce((largest, current) => (current.bytes > largest.bytes ? current : largest));
      return {
        detected: true,
        totalBytes: best.bytes,
        totalGB: toGB(best.bytes),
        gpuName: best.name,
        backend: 'cuda'
      };
    }
  } catch {
    // Continue to AMD detection fallbacks.
  }

  try {
    const sysfsPath = '/sys/class/drm/card0/device/mem_info_vram_total';
    if (fs.existsSync(sysfsPath)) {
      const content = fs.readFileSync(sysfsPath, 'utf8').trim();
      const bytes = Number.parseInt(content, 10);

      if (Number.isFinite(bytes) && bytes > 0) {
        return {
          detected: true,
          totalBytes: bytes,
          totalGB: toGB(bytes),
          gpuName: 'AMD GPU',
          backend: 'rocm'
        };
      }
    }
  } catch {
    // Continue to rocm-smi fallback.
  }

  try {
    const output = execSync('rocm-smi --showmeminfo vram --csv', {
      encoding: 'utf8',
      timeout: SHELL_PROBE_TIMEOUT_MS
    });

    const lines = output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let bestBytes = 0;
    for (const line of lines) {
      const values = line.split(',').map((part) => part.trim());
      for (const value of values) {
        const parsed = Number.parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(parsed) && parsed > bestBytes) {
          bestBytes = parsed;
        }
      }
    }

    if (bestBytes > 0) {
      return {
        detected: true,
        totalBytes: bestBytes,
        totalGB: toGB(bestBytes),
        gpuName: 'AMD GPU',
        backend: 'rocm'
      };
    }
  } catch {
    return noVram;
  }

  return noVram;
}

/**
 * Detects VRAM on macOS via system_profiler, with Apple Silicon unified memory fallback.
 */
function detectMacVram(totalRamBytes: number, cpuModel: string): VramInfo {
  if (process.arch === 'arm64') {
    return {
      detected: true,
      totalBytes: totalRamBytes,
      totalGB: toGB(totalRamBytes),
      gpuName: cpuModel,
      backend: 'metal'
    };
  }

  try {
    const output = execSync('system_profiler SPDisplaysDataType -json', {
      encoding: 'utf8',
      timeout: 2500
    });
    const parsed = JSON.parse(output) as MacDisplaysResult;
    const displays = parsed.SPDisplaysDataType ?? [];

    let bestName = 'Unknown';
    let bestBytes = 0;

    for (const display of displays) {
      for (const gpu of display.spsdisplays_ndrvs ?? []) {
        const memoryString = gpu.spdisplays_vram ?? gpu.spdisplays_vram_shared;
        if (!memoryString) {
          continue;
        }

        const bytes = parseMemoryTextToBytes(memoryString);
        if (bytes > bestBytes) {
          bestBytes = bytes;
          bestName = gpu._name?.trim() || 'Apple GPU';
        }
      }
    }

    if (bestBytes > 0) {
      return {
        detected: true,
        totalBytes: bestBytes,
        totalGB: toGB(bestBytes),
        gpuName: bestName,
        backend: 'metal'
      };
    }
  } catch {
    return getNoVramDetected();
  }

  return getNoVramDetected();
}

/**
 * Detects the best available hardware profile for recommendation logic.
 */
function getHardwareProfile(): HardwareProfile {
  const now = Date.now();
  if (cachedHardwareProfile && now - cachedHardwareProfileAt < HARDWARE_PROFILE_CACHE_MS) {
    return cachedHardwareProfile;
  }

  const totalRamBytes = os.totalmem();
  const freeRamBytes = os.freemem();
  const cpus = os.cpus();

  const cpuModel = cpus[0]?.model ?? 'Unknown CPU';
  const cpuCores = cpus.length;

  let vram = getNoVramDetected();

  if (process.platform === 'win32') {
    vram = detectWindowsVram();
  } else if (process.platform === 'linux') {
    vram = detectLinuxVram();
  } else if (process.platform === 'darwin') {
    vram = detectMacVram(totalRamBytes, cpuModel);
  }

  const platform: HardwareProfile['platform'] =
    process.platform === 'win32' || process.platform === 'linux' || process.platform === 'darwin'
      ? process.platform
      : 'linux';

  const profile: HardwareProfile = {
    ram: {
      totalBytes: totalRamBytes,
      freeBytes: freeRamBytes,
      totalGB: toGB(totalRamBytes),
      freeGB: toGB(freeRamBytes)
    },
    vram,
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      arch: process.arch
    },
    platform
  };

  cachedHardwareProfile = profile;
  cachedHardwareProfileAt = now;

  return profile;
}

/**
 * Registers system telemetry IPC handlers.
 */
export function registerSystemIpcHandlers(): void {
  ipcMain.removeHandler('system:cpu-ram');
  ipcMain.handle('system:cpu-ram', async (): Promise<ApiResponse<CpuRamSnapshot>> => {
    try {
      const totalMemMb = os.totalmem() / (1024 * 1024);
      const freeMemMb = os.freemem() / (1024 * 1024);
      const usedMemMb = totalMemMb - freeMemMb;
      const profile = getHardwareProfile();
      const vramTotalMb =
        profile.vram.detected && profile.vram.totalBytes > 0
          ? Number((profile.vram.totalBytes / (1024 * 1024)).toFixed(1))
          : null;

      return {
        success: true,
        data: {
          cpuPercent: calculateCpuPercent(),
          gpuPercent: detectGpuUsagePercent(),
          ramUsedMb: Number(usedMemMb.toFixed(1)),
          ramTotalMb: Number(totalMemMb.toFixed(1)),
          vramUsedMb: detectGpuMemoryUsageMb(),
          vramTotalMb
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read system telemetry.'
      };
    }
  });

  ipcMain.removeHandler('system:get-hardware-profile');
  ipcMain.handle('system:get-hardware-profile', async (): Promise<ApiResponse<HardwareProfile>> => {
    try {
      return {
        success: true,
        data: getHardwareProfile()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect hardware profile.'
      };
    }
  });
}
