import { ipcMain } from 'electron';
import Store from 'electron-store';
import type { ApiResponse } from '../../renderer/types/ipc.js';
import type { WorkspaceSnapshot } from '../../renderer/types/session.js';
import { getModelDeckConfigDir } from '../services/appPaths.js';

interface SessionStoreSchema {
  workspace?: {
    snapshot?: WorkspaceSnapshot;
  };
}

interface SaveSnapshotPayload {
  snapshot: WorkspaceSnapshot;
}

const sessionStore = new Store<SessionStoreSchema>({
  name: 'session-data',
  cwd: getModelDeckConfigDir()
});

/**
 * Registers session persistence IPC handlers.
 */
export function registerSessionIpcHandlers(): void {
  ipcMain.removeHandler('session:save-snapshot');
  ipcMain.handle(
    'session:save-snapshot',
    async (_event, payload: SaveSnapshotPayload): Promise<ApiResponse<{ success: true }>> => {
      try {
        sessionStore.set('workspace.snapshot', payload.snapshot);
        return {
          success: true,
          data: {
            success: true
          }
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save workspace snapshot.'
        };
      }
    }
  );

  ipcMain.removeHandler('session:load-snapshot');
  ipcMain.handle('session:load-snapshot', async (): Promise<ApiResponse<WorkspaceSnapshot | null>> => {
    try {
      const snapshot = sessionStore.get('workspace.snapshot') ?? null;
      return {
        success: true,
        data: snapshot
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load workspace snapshot.'
      };
    }
  });

  ipcMain.removeHandler('session:clear-snapshot');
  ipcMain.handle('session:clear-snapshot', async (): Promise<ApiResponse<{ success: true }>> => {
    try {
      sessionStore.delete('workspace.snapshot');
      return {
        success: true,
        data: {
          success: true
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear workspace snapshot.'
      };
    }
  });
}
