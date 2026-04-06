import type { Metadata } from 'next';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import ThemeSync from '@/components/system/ThemeSync';
import './globals.css';

export const metadata: Metadata = {
  title: 'ModelDeck',
  description: 'Cross-platform desktop AI workspace',
  icons: {
    icon: './favicon.svg',
    shortcut: './favicon.svg',
    apple: './favicon.svg'
  }
};

interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * Root application layout for the renderer app.
 */
export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <ThemeSync />
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}
