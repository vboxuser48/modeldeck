import { create } from 'zustand';
import type { ModelProvider } from '@/types/model';

interface ModelOption {
	id: string;
	name: string;
	size?: number;
}

interface ModelsStoreState {
	ollamaAvailable: boolean;
	ollamaModels: ModelOption[];
	isRefreshing: boolean;
	lastRefreshAt?: string;
	lastError?: string;
	refreshOllamaModels: () => Promise<void>;
	getModelOptions: (provider: ModelProvider) => ModelOption[];
}

/**
 * Global model store for local/cloud model availability and options.
 */
export const useModelsStore = create<ModelsStoreState>((set, get) => ({
	ollamaAvailable: false,
	ollamaModels: [],
	isRefreshing: false,
	lastRefreshAt: undefined,
	lastError: undefined,

	refreshOllamaModels: async (): Promise<void> => {
		set({ isRefreshing: true, lastError: undefined });

		try {
			const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
			if (!bridge) {
				set({
					ollamaAvailable: false,
					ollamaModels: [],
					isRefreshing: false,
					lastRefreshAt: new Date().toISOString(),
					lastError: 'Electron API unavailable in browser-only runtime.'
				});
				return;
			}

			const [availabilityResult, modelsResult] = await Promise.all([
				bridge.ollama.checkAvailability(),
				bridge.ollama.listModels()
			]);

			const previousModels = get().ollamaModels;

			set({
				ollamaAvailable: Boolean(availabilityResult.data?.available),
				ollamaModels: modelsResult.success && modelsResult.data ? modelsResult.data : previousModels,
				isRefreshing: false,
				lastRefreshAt: new Date().toISOString(),
				lastError: modelsResult.success ? undefined : modelsResult.error ?? 'Failed to refresh Ollama models.'
			});
		} catch (error) {
			set({
				isRefreshing: false,
				lastError: error instanceof Error ? error.message : 'Failed to refresh Ollama models.'
			});
		}
	},

	getModelOptions: (provider): ModelOption[] => {
		if (provider !== 'ollama') {
			return [];
		}

		return get().ollamaModels;
	}
}));
