'use client';

import SystemBar from '@/components/system/SystemBar';
import WorkspaceGrid from '@/components/workspace/WorkspaceGrid';

/**
 * Main workspace route.
 */
export default function WorkspacePage(): React.JSX.Element {
  return (
    <main className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <WorkspaceGrid />
      <SystemBar />
    </main>
  );
}
