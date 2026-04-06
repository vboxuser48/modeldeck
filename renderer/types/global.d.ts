import type { ModelDeckApi } from './ipc.js';

declare global {
  interface Window {
    modeldeck: ModelDeckApi;
  }
}

export {};
