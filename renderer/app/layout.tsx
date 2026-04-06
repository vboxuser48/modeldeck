import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import ThemeSync from '@/components/system/ThemeSync';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'ModelDeck',
  description: 'Cross-platform desktop AI workspace',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeSync />
        <OnboardingGate>{children}</OnboardingGate>
      </body>
    </html>
  );
}
