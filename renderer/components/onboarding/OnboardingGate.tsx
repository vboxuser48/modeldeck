'use client';

import { useEffect, useState } from 'react';
import OnboardingScreen from './OnboardingScreen';
import { ONBOARDING_COMPLETED_KEY, ONBOARDING_OPEN_EVENT } from './constants';

interface OnboardingGateProps {
  children: React.ReactNode;
}

/**
 * Layout-level gate that shows onboarding for first-time users.
 */
export default function OnboardingGate({ children }: OnboardingGateProps): React.JSX.Element {
  const [initialized, setInitialized] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_COMPLETED_KEY) === '1';
    setCompleted(done);
    setInitialized(true);

    const onOpen = (): void => {
      setForcedOpen(true);
    };

    window.addEventListener(ONBOARDING_OPEN_EVENT, onOpen);

    return () => {
      window.removeEventListener(ONBOARDING_OPEN_EVENT, onOpen);
    };
  }, []);

  const completeOnboarding = (): void => {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, '1');
    setCompleted(true);
    setForcedOpen(false);
  };

  if (!initialized) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {(!completed || forcedOpen) ? <OnboardingScreen onComplete={completeOnboarding} /> : null}
    </>
  );
}
