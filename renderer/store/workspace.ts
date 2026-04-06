import { create } from 'zustand';
import { loadWorkspaceSnapshot, saveWorkspaceSnapshot } from '@/lib/session';
import type { ChatMessage } from '@/types/message';
import type {
	Session,
	SessionParameters,
	SessionStatus,
	WorkspaceLayout,
	WorkspacePanel,
	WorkspaceSnapshot
} from '@/types/session';

const DEFAULT_PARAMETERS: SessionParameters = {
	advancedMode: false,
	projectMode: false,
	compareMode: false,
	compareModelIds: [],
	lastTemplateId: undefined,
	temperature: 0.7,
	maxTokens: 1024,
	topP: 1,
	frequencyPenalty: 0,
	systemPrompt: '',
	rawJsonMode: false,
	rawJsonPayload: ''
};

/**
 * Backfills missing fields from older snapshots into session parameters.
 */
function normalizeSessionParameters(parameters?: Partial<SessionParameters>): SessionParameters {
	return {
		...DEFAULT_PARAMETERS,
		...(parameters ?? {})
	};
}

/**
 * Creates a default session object for a new panel session id.
 */
export function createDefaultSession(sessionId: string): Session {
	const now = new Date().toISOString();
	return {
		id: sessionId,
		name: 'New chat',
		modelId: 'llama3.1:8b',
		provider: 'ollama',
		messages: [],
		parameters: { ...DEFAULT_PARAMETERS },
		createdAt: now,
		updatedAt: now
	};
}

interface AddPanelOptions {
	modelId?: string;
	provider?: Session['provider'];
}

/**
 * Creates a panel bound to a newly generated session.
 */
export function createPanelWithSession(options?: AddPanelOptions): { panel: WorkspacePanel; session: Session } {
	const sessionId = crypto.randomUUID();
	const panelId = crypto.randomUUID();
	const session = createDefaultSession(sessionId);

	if (options?.modelId) {
		session.modelId = options.modelId;
	}

	if (options?.provider) {
		session.provider = options.provider;
	}

	return {
		panel: {
			id: panelId,
			sessionId,
			status: 'idle'
		},
		session
	};
}

interface WorkspaceStoreState {
	layout: WorkspaceLayout;
	sidebarOpen: boolean;
	activePanelId?: string;
	panels: Map<string, WorkspacePanel>;
	sessions: Map<string, Session>;
	panelOrder: string[];
	hasStreamingPanels: () => boolean;
	setLayout: (layout: WorkspaceLayout) => void;
	toggleSidebar: () => void;
	ensurePanelCountForLayout: (layout: WorkspaceLayout) => void;
	addPanel: (options?: AddPanelOptions) => string;
	removePanel: (panelId: string) => void;
	setActivePanel: (panelId: string) => void;
	updatePanelStatus: (sessionId: string, status: SessionStatus) => void;
	appendMessage: (sessionId: string, message: ChatMessage) => void;
	clearMessages: (sessionId: string) => void;
	updateSessionParameters: (sessionId: string, parameters: SessionParameters) => void;
	updateSessionName: (sessionId: string, name: string) => void;
	updateSessionModel: (sessionId: string, modelId: string) => void;
	updateSessionProvider: (sessionId: string, provider: Session['provider']) => void;
	createEmptySessionInActivePanel: () => string | null;
	deleteSession: (sessionId: string) => Promise<void>;
	loadSessionIntoPanel: (sessionId: string, panelId?: string, sessionData?: Session) => Promise<void>;
	ensureSession: (sessionId: string) => void;
	hydrateSnapshot: (snapshot: WorkspaceSnapshot) => void;
	toSnapshot: () => WorkspaceSnapshot;
}

/**
 * Global workspace store for panel and session orchestration.
 */
export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
	layout: 'single',
	sidebarOpen: true,
	activePanelId: undefined,
	panels: new Map<string, WorkspacePanel>(),
	sessions: new Map<string, Session>(),
	panelOrder: [],

	hasStreamingPanels: (): boolean => {
		const state = get();
		for (const panel of state.panels.values()) {
			if (panel.status === 'streaming') {
				return true;
			}
		}

		return false;
	},

	setLayout: (layout): void => {
		if (get().hasStreamingPanels()) {
			return;
		}

		set({ layout: 'single' });
		get().ensurePanelCountForLayout('single');
	},

	toggleSidebar: (): void => {
		set((state) => ({ sidebarOpen: !state.sidebarOpen }));
	},

	ensurePanelCountForLayout: (_layout): void => {
		const target = 1;
		const state = get();

		if (state.panelOrder.length === target) {
			return;
		}

		if (state.panelOrder.length < target) {
			const nextPanels = new Map(state.panels);
			const nextSessions = new Map(state.sessions);
			const nextOrder = [...state.panelOrder];

			while (nextOrder.length < target) {
				const { panel, session } = createPanelWithSession();
				nextPanels.set(panel.id, panel);
				nextSessions.set(session.id, session);
				nextOrder.push(panel.id);
			}

			set({
				panels: nextPanels,
				sessions: nextSessions,
				panelOrder: nextOrder,
				activePanelId: state.activePanelId ?? nextOrder[0]
			});
			return;
		}

		const trimmedOrder = state.panelOrder.slice(0, target);
		const trimmedPanels = new Map<string, WorkspacePanel>();
		const trimmedSessions = new Map<string, Session>();

		for (const panelId of trimmedOrder) {
			const panel = state.panels.get(panelId);
			if (!panel) {
				continue;
			}

			trimmedPanels.set(panelId, panel);
			const session = state.sessions.get(panel.sessionId);
			if (session) {
				trimmedSessions.set(panel.sessionId, session);
			}
		}

		set({
			panels: trimmedPanels,
			sessions: trimmedSessions,
			panelOrder: trimmedOrder,
			activePanelId: trimmedOrder.includes(state.activePanelId ?? '')
				? state.activePanelId
				: trimmedOrder[0]
		});
	},

	addPanel: (options): string => {
		const state = get();
		const { panel, session } = createPanelWithSession(options);
		const nextPanels = new Map(state.panels);
		const nextSessions = new Map(state.sessions);
		nextPanels.set(panel.id, panel);
		nextSessions.set(session.id, session);

		set({
			panels: nextPanels,
			sessions: nextSessions,
			panelOrder: [...state.panelOrder, panel.id],
			activePanelId: panel.id
		});

		return panel.id;
	},

	removePanel: (panelId): void => {
		const state = get();
		if (!state.panels.has(panelId)) {
			return;
		}

		const nextPanels = new Map(state.panels);
		const nextSessions = new Map(state.sessions);
		const removedPanel = nextPanels.get(panelId);
		nextPanels.delete(panelId);

		if (removedPanel) {
			nextSessions.delete(removedPanel.sessionId);
		}

		const nextOrder = state.panelOrder.filter((id) => id !== panelId);
		set({
			panels: nextPanels,
			sessions: nextSessions,
			panelOrder: nextOrder,
			activePanelId: nextOrder[0]
		});
	},

	setActivePanel: (panelId): void => {
		set({ activePanelId: panelId });
	},

	updatePanelStatus: (sessionId, status): void => {
		const state = get();
		const nextPanels = new Map(state.panels);

		for (const [panelId, panel] of nextPanels.entries()) {
			if (panel.sessionId === sessionId) {
				nextPanels.set(panelId, { ...panel, status });
			}
		}

		set({ panels: nextPanels });
	},

	appendMessage: (sessionId, message): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			messages: [...session.messages, message],
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	clearMessages: (sessionId): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			messages: [],
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	updateSessionParameters: (sessionId, parameters): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			parameters: normalizeSessionParameters(parameters),
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	updateSessionName: (sessionId, name): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const trimmedName = name.trim();
		if (!trimmedName || trimmedName === session.name) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			name: trimmedName,
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	updateSessionModel: (sessionId, modelId): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			modelId,
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	updateSessionProvider: (sessionId, provider): void => {
		const state = get();
		const session = state.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, {
			...session,
			provider,
			updatedAt: new Date().toISOString()
		});

		set({ sessions: nextSessions });
	},

	createEmptySessionInActivePanel: (): string | null => {
		const state = get();

		const targetPanelId = state.activePanelId ?? state.panelOrder[0];
		if (!targetPanelId) {
			return null;
		}

		const targetPanel = state.panels.get(targetPanelId);
		if (!targetPanel) {
			return null;
		}

		const sessionId = crypto.randomUUID();
		const session = createDefaultSession(sessionId);

		const nextPanels = new Map(state.panels);
		nextPanels.set(targetPanelId, {
			...targetPanel,
			sessionId,
			status: 'idle'
		});

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, session);

		set({
			panels: nextPanels,
			sessions: nextSessions,
			activePanelId: targetPanelId
		});

		return sessionId;
	},

	deleteSession: async (sessionId): Promise<void> => {
		const state = get();
		if (!state.sessions.has(sessionId)) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.delete(sessionId);

		const nextPanels = new Map(state.panels);
		for (const [panelId, panel] of nextPanels.entries()) {
			if (panel.sessionId !== sessionId) {
				continue;
			}

			const replacementSessionId = crypto.randomUUID();
			const replacementSession = createDefaultSession(replacementSessionId);
			nextSessions.set(replacementSessionId, replacementSession);

			nextPanels.set(panelId, {
				...panel,
				sessionId: replacementSessionId,
				status: 'idle'
			});
		}

		set({
			panels: nextPanels,
			sessions: nextSessions
		});

		await saveWorkspaceSnapshot(get().toSnapshot());
	},

	loadSessionIntoPanel: async (sessionId, panelId, sessionData): Promise<void> => {
		const existingSession = get().sessions.get(sessionId);
		let resolvedSession = sessionData ?? existingSession;

		if (!resolvedSession) {
			const snapshot = await loadWorkspaceSnapshot();
			resolvedSession = snapshot?.sessions.find((session) => session.id === sessionId);
		}

		if (!resolvedSession) {
			return;
		}

		let targetPanelId = panelId;
		if (!targetPanelId) {
			targetPanelId = get().addPanel();
		}

		const state = get();
		const targetPanel = targetPanelId ? state.panels.get(targetPanelId) : undefined;
		if (!targetPanel || !targetPanelId) {
			return;
		}

		const nextPanels = new Map(state.panels);
		const nextSessions = new Map(state.sessions);

		nextPanels.set(targetPanelId, {
			...targetPanel,
			sessionId,
			status: 'idle'
		});
		nextSessions.set(sessionId, {
			...resolvedSession,
			parameters: normalizeSessionParameters(resolvedSession.parameters)
		});

		set({
			panels: nextPanels,
			sessions: nextSessions,
			activePanelId: targetPanelId
		});

		await saveWorkspaceSnapshot(get().toSnapshot());
	},

	ensureSession: (sessionId): void => {
		const state = get();
		if (state.sessions.has(sessionId)) {
			return;
		}

		const nextSessions = new Map(state.sessions);
		nextSessions.set(sessionId, createDefaultSession(sessionId));
		set({ sessions: nextSessions });
	},

	hydrateSnapshot: (snapshot): void => {
		const panels = new Map<string, WorkspacePanel>();
		const sessions = new Map<string, Session>();
		const panelOrder: string[] = [];

		for (const panel of snapshot.panels) {
			panels.set(panel.id, panel);
			panelOrder.push(panel.id);
		}

		for (const session of snapshot.sessions) {
			sessions.set(session.id, {
				...session,
				parameters: normalizeSessionParameters(session.parameters)
			});
		}

		set({
			layout: 'single',
			activePanelId: snapshot.activePanelId,
			panels,
			sessions,
			panelOrder
		});

		get().ensurePanelCountForLayout('single');
	},

	toSnapshot: (): WorkspaceSnapshot => {
		const state = get();
		return {
			version: 1,
			layout: 'single',
			activePanelId: state.activePanelId,
			panels: state.panelOrder
				.map((panelId) => state.panels.get(panelId))
				.filter((panel): panel is WorkspacePanel => Boolean(panel)),
			sessions: Array.from(state.sessions.values()),
			savedAt: new Date().toISOString()
		};
	}
}));
