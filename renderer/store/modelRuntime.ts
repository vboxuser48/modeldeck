import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SessionStatus } from '@/types/session';

type TopBarModelStatus = 'idle' | 'loading' | 'running' | 'error';

interface RuntimeMemoryState {
	ramUsedMb: number | null;
	ramTotalMb: number | null;
	vramUsedMb: number | null;
	vramTotalMb: number | null;
}

interface ModelRuntimeStoreState extends RuntimeMemoryState {
	provider: 'Ollama';
	activeModelName: string;
	desiredModelName: string;
	panelStatus: SessionStatus;
	status: TopBarModelStatus;
	keepModelWarm: boolean;
	isRestarting: boolean;
	isPolling: boolean;
	lastError?: string;
	lastUpdatedAt?: string;
	lastWarmPingAt?: number;
	setDesiredModelName: (modelName: string) => void;
	setPanelStatus: (status: SessionStatus) => void;
	setKeepModelWarm: (enabled: boolean) => Promise<void>;
	refreshRuntime: () => Promise<void>;
	restartModel: () => Promise<void>;
	startRealtime: () => void;
	stopRealtime: () => void;
}

const POLL_INTERVAL_MS = 3000;
const KEEP_WARM_INTERVAL_MS = 120000;
let runtimePollInterval: number | null = null;
let runtimePollSubscribers = 0;

function deriveModelStatus(
	panelStatus: SessionStatus,
	restarting: boolean,
	isRunning: boolean,
	hasActiveModel: boolean,
	hasError: boolean
): TopBarModelStatus {
	if (hasError) {
		return 'error';
	}

	if (restarting || panelStatus === 'loading-models') {
		return 'loading';
	}

	if (panelStatus === 'streaming' || (isRunning && hasActiveModel)) {
		return 'running';
	}

	return 'idle';
}

/**
 * Global runtime state for the workspace top bar.
 */
export const useModelRuntimeStore = create<ModelRuntimeStoreState>()(
	persist(
		(set, get) => ({
			provider: 'Ollama',
			activeModelName: '',
			desiredModelName: '',
			panelStatus: 'idle',
			status: 'idle',
			keepModelWarm: false,
			isRestarting: false,
			isPolling: false,
			lastError: undefined,
			lastUpdatedAt: undefined,
			lastWarmPingAt: undefined,
			ramUsedMb: null,
			ramTotalMb: null,
			vramUsedMb: null,
			vramTotalMb: null,

			setDesiredModelName: (modelName): void => {
				set({ desiredModelName: modelName.trim() });
			},

			setPanelStatus: (panelStatus): void => {
				const state = get();
				set({
					panelStatus,
					status: deriveModelStatus(
						panelStatus,
						state.isRestarting,
						state.status === 'running',
						Boolean(state.activeModelName),
						Boolean(state.lastError)
					)
				});
			},

			setKeepModelWarm: async (enabled): Promise<void> => {
				set({ keepModelWarm: enabled });

				const state = get();
				const targetModel = state.desiredModelName || state.activeModelName;
				if (!targetModel) {
					return;
				}

				const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
				if (!bridge) {
					return;
				}

				const response = await bridge.ollama.keepWarm(targetModel, enabled);
				if (!response.success) {
					set({
						lastError: response.error ?? 'Failed to update keep-warm state.',
						status: 'error'
					});
					return;
				}

				set({ lastError: undefined, lastWarmPingAt: Date.now() });
			},

			refreshRuntime: async (): Promise<void> => {
				const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
				if (!bridge) {
					set({
						lastError: 'Electron API unavailable in browser-only runtime.',
						status: 'error'
					});
					return;
				}

				const [systemResult, hardwareResult, ollamaStatusResult, runtimeResult] = await Promise.all([
					bridge.system.getCpuRam(),
					bridge.system.getHardwareProfile(),
					bridge.ollama.status(),
					bridge.ollama.getRuntimeState()
				]);

				const hasApiError =
					!systemResult.success ||
					!ollamaStatusResult.success ||
					!runtimeResult.success;

				const state = get();
				const runtimeData = runtimeResult.data;
				const preferredModel = state.desiredModelName;
				const activeModels = runtimeData?.activeModels ?? [];

				const activeModelName =
					preferredModel && (activeModels.includes(preferredModel) || activeModels.length === 0)
						? preferredModel
						: activeModels[0] ?? preferredModel;

				const fallbackVramTotalMb = hardwareResult.success
					? Number((hardwareResult.data?.vram.totalBytes ?? 0) / (1024 * 1024)) || null
					: null;

				const nextError = hasApiError
					? runtimeResult.error ?? ollamaStatusResult.error ?? systemResult.error ?? 'Runtime telemetry unavailable.'
					: undefined;

				const isRunning = Boolean(
					runtimeData?.running ?? ollamaStatusResult.data?.running
				);

				const shouldWarm =
					state.keepModelWarm &&
					Boolean(activeModelName) &&
					(!state.lastWarmPingAt || Date.now() - state.lastWarmPingAt >= KEEP_WARM_INTERVAL_MS);

				if (shouldWarm && activeModelName) {
					const keepWarmResult = await bridge.ollama.keepWarm(activeModelName, true);
					if (keepWarmResult.success) {
						set({ lastWarmPingAt: Date.now() });
					}
				}

				set({
					activeModelName,
					ramUsedMb: systemResult.success ? systemResult.data?.ramUsedMb ?? null : state.ramUsedMb,
					ramTotalMb: systemResult.success ? systemResult.data?.ramTotalMb ?? null : state.ramTotalMb,
					vramUsedMb: runtimeData?.vramUsedMb ?? systemResult.data?.vramUsedMb ?? state.vramUsedMb,
					vramTotalMb:
						runtimeData?.vramTotalMb ??
						systemResult.data?.vramTotalMb ??
						fallbackVramTotalMb ??
						state.vramTotalMb,
					lastError: nextError,
					lastUpdatedAt: new Date().toISOString(),
					status: deriveModelStatus(
						state.panelStatus,
						state.isRestarting,
						isRunning,
						Boolean(activeModelName),
						Boolean(nextError)
					)
				});
			},

			restartModel: async (): Promise<void> => {
				const state = get();
				const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;

				if (!bridge) {
					set({
						lastError: 'Electron API unavailable in browser-only runtime.',
						status: 'error'
					});
					return;
				}

				const targetModel = state.desiredModelName || state.activeModelName;
				set({ isRestarting: true, lastError: undefined, status: 'loading' });

				const restartResult = await bridge.ollama.restartModel(targetModel);
				if (!restartResult.success) {
					set({
						isRestarting: false,
						lastError: restartResult.error ?? 'Failed to restart model.',
						status: 'error'
					});
					return;
				}

				if (get().keepModelWarm && targetModel) {
					await bridge.ollama.keepWarm(targetModel, true);
				}

				set({ isRestarting: false, lastError: undefined });
				await get().refreshRuntime();
			},

			startRealtime: (): void => {
				runtimePollSubscribers += 1;
				if (runtimePollInterval !== null) {
					return;
				}

				set({ isPolling: true });
				void get().refreshRuntime();
				runtimePollInterval = window.setInterval(() => {
					void get().refreshRuntime();
				}, POLL_INTERVAL_MS);
			},

			stopRealtime: (): void => {
				runtimePollSubscribers = Math.max(0, runtimePollSubscribers - 1);
				if (runtimePollSubscribers > 0) {
					return;
				}

				if (runtimePollInterval !== null) {
					window.clearInterval(runtimePollInterval);
					runtimePollInterval = null;
				}

				set({ isPolling: false });
			}
		}),
		{
			name: 'modeldeck:model-runtime:v1',
			partialize: (state) => ({
				keepModelWarm: state.keepModelWarm
			})
		}
	)
);
