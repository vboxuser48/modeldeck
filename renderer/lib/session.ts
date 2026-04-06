import type { Session, WorkspaceSnapshot } from '@/types/session';

/**
 * Safely resolves preload API in environments where Electron bridge may be unavailable.
 */
function getModelDeckBridge(): Window['modeldeck'] | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const candidate = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
	return candidate ?? null;
}

/**
 * Reads a persisted workspace snapshot via main-process session IPC.
 */
export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot | null> {
	// MIGRATED: electron-store via IPC
	const bridge = getModelDeckBridge();
	if (!bridge) {
		return null;
	}

	const response = await bridge.sessions.loadSnapshot();
	if (!response.success || !response.data) {
		return null;
	}

	if (response.data.version !== 1) {
		return null;
	}

	return response.data;
}

/**
 * Persists a workspace snapshot via main-process session IPC.
 */
export async function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshot): Promise<void> {
	// MIGRATED: electron-store via IPC
	const bridge = getModelDeckBridge();
	if (!bridge || typeof window === 'undefined') {
		return;
	}

	await bridge.sessions.saveSnapshot(snapshot);
	window.dispatchEvent(new CustomEvent<WorkspaceSnapshot>('modeldeck:snapshot-updated', { detail: snapshot }));
}

/**
 * Removes workspace snapshot persistence data.
 */
export async function clearWorkspaceSnapshot(): Promise<void> {
	const bridge = getModelDeckBridge();
	if (!bridge || typeof window === 'undefined') {
		return;
	}

	await bridge.sessions.clearSnapshot();
	window.dispatchEvent(new CustomEvent<WorkspaceSnapshot | null>('modeldeck:snapshot-updated', { detail: null }));
}

/**
 * Formats a session as pretty JSON for export.
 */
export function exportSessionAsJson(session: Session): string {
	return JSON.stringify(session, null, 2);
}

/**
 * Formats a session as Markdown transcript for export.
 */
export function exportSessionAsMarkdown(session: Session): string {
	const lines: string[] = [];
	lines.push(`# ${session.name}`);
	lines.push('');
	lines.push(`- Session ID: ${session.id}`);
	lines.push(`- Provider: ${session.provider}`);
	lines.push(`- Model: ${session.modelId}`);
	lines.push(`- Created: ${session.createdAt}`);
	lines.push(`- Updated: ${session.updatedAt}`);
	lines.push('');

	for (const message of session.messages) {
		lines.push(`## ${message.role.toUpperCase()}`);
		lines.push('');
		lines.push(message.content);
		lines.push('');
	}

	return lines.join('\n');
}

/**
 * Starts periodic autosave and unload-save hooks for workspace snapshot persistence.
 */
export function startWorkspaceAutoSave(
	getSnapshot: () => WorkspaceSnapshot,
	intervalMs = 30000
): () => void {
	if (typeof window === 'undefined') {
		return () => undefined;
	}

	const writeNow = (): void => {
		void saveWorkspaceSnapshot(getSnapshot());
	};

	const interval = window.setInterval(writeNow, intervalMs);
	window.addEventListener('beforeunload', writeNow);

	return () => {
		window.clearInterval(interval);
		window.removeEventListener('beforeunload', writeNow);
	};
}
