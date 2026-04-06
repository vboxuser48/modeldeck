import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PromptTemplate } from '@/types/template';

type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsStoreState {
	theme: ThemeMode;
	defaultAdvancedMode: boolean;
	customPromptTemplates: PromptTemplate[];
	setTheme: (theme: ThemeMode) => void;
	setDefaultAdvancedMode: (enabled: boolean) => void;
	addCustomPromptTemplate: (template: Omit<PromptTemplate, 'isCustom'>) => void;
}

/**
 * Global settings store for renderer-safe user preferences and key metadata.
 */
export const useSettingsStore = create<SettingsStoreState>()(
	persist(
		(set) => ({
			theme: 'dark',
			defaultAdvancedMode: false,
			customPromptTemplates: [],

			setTheme: (theme): void => {
				set({ theme });
			},
			setDefaultAdvancedMode: (enabled): void => {
				set({ defaultAdvancedMode: enabled });
			},
			addCustomPromptTemplate: (template): void => {
				set((state) => ({
					customPromptTemplates: [
						...state.customPromptTemplates,
						{
							...template,
							isCustom: true
						}
					]
				}));
			}
		}),
		{
			name: 'modeldeck:settings:v1',
			partialize: (state) => ({
				theme: state.theme,
				defaultAdvancedMode: state.defaultAdvancedMode,
				customPromptTemplates: state.customPromptTemplates
			})
		}
	)
);
