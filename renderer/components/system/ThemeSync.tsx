'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings';

/**
 * Applies the persisted theme preference to the root html element globally.
 */
export default function ThemeSync(): React.JSX.Element | null {
  const theme = useSettingsStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (): void => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();

    const onSystemThemeChange = (): void => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    media.addEventListener('change', onSystemThemeChange);
    return () => {
      media.removeEventListener('change', onSystemThemeChange);
    };
  }, [theme]);

  return null;
}
