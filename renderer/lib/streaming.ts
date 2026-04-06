import type { ApiResponse, StreamErrorEvent, StreamRequest } from '@/types/ipc';

/**
 * Streaming lifecycle phases for one session.
 */
export type StreamPhase = 'idle' | 'starting' | 'streaming' | 'done' | 'error' | 'canceled';

/**
 * Stateful stream snapshot for one panel session.
 */
export interface StreamState {
	sessionId: string;
	phase: StreamPhase;
	output: string;
	error?: string;
	startedAt?: string;
	firstTokenAt?: string;
	completedAt?: string;
	updatedAt: string;
}

/**
 * Events accepted by the stream reducer.
 */
export type StreamStateEvent =
	| { type: 'start' }
	| { type: 'chunk'; chunk: string }
	| { type: 'done' }
	| { type: 'error'; error: string }
	| { type: 'cancel' }
	| { type: 'reset' };

/**
 * Creates an initial stream state for a session.
 */
export function createInitialStreamState(sessionId: string): StreamState {
	const now = new Date().toISOString();
	return {
		sessionId,
		phase: 'idle',
		output: '',
		updatedAt: now
	};
}

/**
 * Applies one stream event to state and returns the next snapshot.
 */
export function reduceStreamState(state: StreamState, event: StreamStateEvent): StreamState {
	const now = new Date().toISOString();

	switch (event.type) {
		case 'start':
			return {
				...state,
				phase: 'starting',
				output: '',
				error: undefined,
				startedAt: now,
				firstTokenAt: undefined,
				completedAt: undefined,
				updatedAt: now
			};
		case 'chunk':
			return {
				...state,
				phase: 'streaming',
				output: `${state.output}${event.chunk}`,
				firstTokenAt: state.firstTokenAt ?? now,
				updatedAt: now
			};
		case 'done':
			return {
				...state,
				phase: 'done',
				completedAt: now,
				updatedAt: now
			};
		case 'error':
			return {
				...state,
				phase: 'error',
				error: event.error,
				completedAt: now,
				updatedAt: now
			};
		case 'cancel':
			return {
				...state,
				phase: 'canceled',
				completedAt: now,
				updatedAt: now
			};
		case 'reset':
			return {
				...createInitialStreamState(state.sessionId),
				output: ''
			};
		default:
			return state;
	}
}

/**
 * Options used to create a session stream controller.
 */
export interface StreamControllerOptions {
	sessionId: string;
	provider: 'ollama';
	payload: StreamRequest;
	onStateChange?: (state: StreamState) => void;
}

/**
 * Runtime stream controller for one session.
 */
export interface SessionStreamController {
	getState: () => StreamState;
	start: () => Promise<ApiResponse<{ accepted: boolean }>>;
	cancel: () => Promise<ApiResponse<{ canceled: boolean }>>;
	dispose: () => void;
}

/**
 * Creates a stream controller that wires IPC events into a local state machine.
 */
export function createSessionStreamController(
	options: StreamControllerOptions
): SessionStreamController {
	const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
	let state = createInitialStreamState(options.sessionId);

	const emitState = (): void => {
		if (options.onStateChange) {
			options.onStateChange(state);
		}
	};

	const applyEvent = (event: StreamStateEvent): void => {
		state = reduceStreamState(state, event);
		emitState();
	};

	const onChunk = (event: { sessionId: string; chunk: string }): void => {
		if (event.sessionId === options.sessionId) {
			applyEvent({ type: 'chunk', chunk: event.chunk });
		}
	};

	const onDone = (event: { sessionId: string }): void => {
		if (event.sessionId === options.sessionId) {
			applyEvent({ type: 'done' });
		}
	};

	const onError = (event: StreamErrorEvent): void => {
		if (event.sessionId === options.sessionId) {
			applyEvent({ type: 'error', error: event.error });
		}
	};

	const unsubs: Array<() => void> = [];
	if (bridge) {
		unsubs.push(bridge.events.onOllamaChunk(onChunk));
		unsubs.push(bridge.events.onOllamaDone(onDone));
		unsubs.push(bridge.events.onOllamaError(onError));
	}

	emitState();

	return {
		getState: () => state,
		start: async (): Promise<ApiResponse<{ accepted: boolean }>> => {
			applyEvent({ type: 'start' });

			if (!bridge) {
				const errorMessage = 'Electron API unavailable in browser-only runtime.';
				applyEvent({ type: 'error', error: errorMessage });
				return {
					success: false,
					error: errorMessage
				};
			}

			const response = await bridge.ollama.streamChat(options.payload);

			if (!response.success) {
				applyEvent({
					type: 'error',
					error: response.error ?? 'Failed to start stream.'
				});
			}

			return response;
		},
		cancel: async (): Promise<ApiResponse<{ canceled: boolean }>> => {
			if (!bridge) {
				return {
					success: false,
					error: 'Electron API unavailable in browser-only runtime.'
				};
			}

			const response = await bridge.ollama.cancelStream(options.sessionId);

			if (response.success && response.data?.canceled) {
				applyEvent({ type: 'cancel' });
			}

			return response;
		},
		dispose: (): void => {
			for (const unsubscribe of unsubs) {
				unsubscribe();
			}
		}
	};
}
