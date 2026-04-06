'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch } from '@/components/ui';
import { ONBOARDING_COMPLETED_KEY, ONBOARDING_OPEN_EVENT } from '@/components/onboarding/constants';
import { useSettingsStore } from '@/store/settings';
import type { LocalApiServerStatus, OllamaModel } from '@/types/ipc';

interface ApiPanelState {
  modelId: string;
  port: number;
  prompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

/**
 * Settings route for user preferences and API key management.
 */
export default function SettingsPage(): React.JSX.Element {
  const defaultAdvancedMode = useSettingsStore((state) => state.defaultAdvancedMode);
  const setDefaultAdvancedMode = useSettingsStore((state) => state.setDefaultAdvancedMode);
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
  const [apiStatus, setApiStatus] = useState<LocalApiServerStatus | null>(null);
  const [apiWorking, setApiWorking] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<string>('');
  const [apiState, setApiState] = useState<ApiPanelState>({
    modelId: '',
    port: 8765,
    prompt: 'Write a short hello world function in JavaScript.',
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 256,
    systemPrompt: ''
  });

  useEffect(() => {
    const loadApiPanelContext = async (): Promise<void> => {
      const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
      if (!bridge) {
        return;
      }

      const [modelsResult, statusResult] = await Promise.all([
        bridge.ollama.listModels(),
        bridge.api.getLocalServerStatus()
      ]);

      if (modelsResult.success && modelsResult.data) {
        setAvailableModels(modelsResult.data);
      }

      if (statusResult.success && statusResult.data) {
        setApiStatus(statusResult.data);
        setApiState((previous) => ({
          ...previous,
          modelId: previous.modelId || statusResult.data?.modelId || modelsResult.data?.[0]?.id || ''
        }));
      } else if (modelsResult.data?.[0]?.id) {
        setApiState((previous) => ({
          ...previous,
          modelId: previous.modelId || modelsResult.data?.[0]?.id || ''
        }));
      }
    };

    void loadApiPanelContext();
  }, []);

  useEffect(() => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      return;
    }

    const interval = window.setInterval(async () => {
      const result = await bridge.api.getLocalServerStatus();
      if (result.success && result.data) {
        setApiStatus(result.data);
      }
    }, 2500);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const setApiPartial = (partial: Partial<ApiPanelState>): void => {
    setApiState((previous) => ({
      ...previous,
      ...partial
    }));
  };

  const startLocalApi = async (): Promise<void> => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      setApiError('Electron API unavailable in browser-only runtime.');
      return;
    }

    if (!apiState.modelId.trim()) {
      setApiError('Select an Ollama model before starting the API server.');
      return;
    }

    setApiWorking(true);
    setApiError(null);
    const result = await bridge.api.startLocalServer({
      modelId: apiState.modelId,
      port: apiState.port
    });
    setApiWorking(false);

    if (!result.success || !result.data) {
      setApiError(result.error ?? 'Failed to start local API server.');
      return;
    }

    setApiStatus(result.data);
  };

  const stopLocalApi = async (): Promise<void> => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      setApiError('Electron API unavailable in browser-only runtime.');
      return;
    }

    setApiWorking(true);
    setApiError(null);
    const result = await bridge.api.stopLocalServer();
    setApiWorking(false);

    if (!result.success || !result.data) {
      setApiError(result.error ?? 'Failed to stop local API server.');
      return;
    }

    setApiStatus(result.data);
  };

  const sendLocalApiPrompt = async (): Promise<void> => {
    const bridge = (window as unknown as { modeldeck?: Window['modeldeck'] }).modeldeck;
    if (!bridge) {
      setApiError('Electron API unavailable in browser-only runtime.');
      return;
    }

    if (!apiStatus?.running) {
      setApiError('Start the local API server first.');
      return;
    }

    if (!apiState.prompt.trim()) {
      setApiError('Prompt cannot be empty.');
      return;
    }

    setApiWorking(true);
    setApiError(null);
    setApiResponse('');

    const result = await bridge.api.generateLocal({
      prompt: apiState.prompt,
      modelId: apiState.modelId,
      temperature: apiState.temperature,
      topP: apiState.topP,
      maxTokens: apiState.maxTokens,
      systemPrompt: apiState.systemPrompt || undefined
    });

    setApiWorking(false);

    if (!result.success || !result.data) {
      setApiError(result.error ?? 'Failed to call local API endpoint.');
      return;
    }

    setApiResponse(result.data.text || '');
  };

  const apiEndpoint = apiStatus?.endpoint || `http://127.0.0.1:${apiState.port}`;
  const curlExample = useMemo(() => {
    const body = {
      prompt: apiState.prompt,
      model: apiState.modelId || 'your-model-id',
      temperature: apiState.temperature,
      top_p: apiState.topP,
      max_tokens: apiState.maxTokens,
      ...(apiState.systemPrompt.trim() ? { system_prompt: apiState.systemPrompt.trim() } : {})
    };

    return `curl -X POST ${apiEndpoint}/generate -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`;
  }, [apiEndpoint, apiState.maxTokens, apiState.modelId, apiState.prompt, apiState.systemPrompt, apiState.temperature, apiState.topP]);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="flex items-center justify-between border border-zinc-800 bg-zinc-900 px-4 py-3">
              <div className="flex items-center gap-2">
                <Link href="/">
                  <Button variant="outline" className="h-8 px-2">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                </Link>
                <h1 className="text-base font-semibold tracking-wide">Settings</h1>
              </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Default Prompt Mode</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <Label>Simple / Advanced</Label>
              <p className="text-xs text-zinc-500">
                Advanced mode as default: {defaultAdvancedMode ? 'enabled' : 'disabled'}
              </p>
            </div>
            <Switch checked={defaultAdvancedMode} onCheckedChange={setDefaultAdvancedMode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-400">Launch first-time onboarding again anytime.</p>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
                window.dispatchEvent(new Event(ONBOARDING_OPEN_EVENT));
              }}
            >
              Re-open Onboarding
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expose as API</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <section className="border border-zinc-800 bg-zinc-950 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-100">Local endpoint</p>
                  <p className="text-xs text-zinc-500">{apiEndpoint}/generate</p>
                </div>
                {apiStatus?.running ? <Badge variant="success">Running</Badge> : <Badge variant="destructive">Stopped</Badge>}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="api-model">Model</Label>
                  <select
                    id="api-model"
                    value={apiState.modelId}
                    onChange={(event) => setApiPartial({ modelId: event.target.value })}
                    className="modeldeck-select h-9 w-full border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  >
                    <option value="">Select model</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="api-port">Port</Label>
                  <Input
                    id="api-port"
                    type="number"
                    value={apiState.port}
                    onChange={(event) => setApiPartial({ port: Number(event.target.value) || 8765 })}
                    min={1024}
                    max={65535}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={apiWorking || apiStatus?.running} onClick={() => void startLocalApi()}>
                  Start Local API
                </Button>
                <Button variant="outline" disabled={apiWorking || !apiStatus?.running} onClick={() => void stopLocalApi()}>
                  Stop API
                </Button>
              </div>

              <p className="mt-3 text-xs text-zinc-500">Security: server binds to 127.0.0.1 only (local machine access).</p>
            </section>

            <section className="border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 text-sm text-zinc-100">Try /generate from the app</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-1">
                  <Label htmlFor="api-temperature">Temperature</Label>
                  <Input
                    id="api-temperature"
                    type="number"
                    step="0.1"
                    value={apiState.temperature}
                    onChange={(event) => setApiPartial({ temperature: Number(event.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="api-top-p">Top P</Label>
                  <Input
                    id="api-top-p"
                    type="number"
                    step="0.05"
                    value={apiState.topP}
                    onChange={(event) => setApiPartial({ topP: Number(event.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="api-max-tokens">Max Tokens</Label>
                  <Input
                    id="api-max-tokens"
                    type="number"
                    value={apiState.maxTokens}
                    onChange={(event) => setApiPartial({ maxTokens: Number(event.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-1">
                <Label htmlFor="api-system-prompt">System Prompt (optional)</Label>
                <textarea
                  id="api-system-prompt"
                  value={apiState.systemPrompt}
                  onChange={(event) => setApiPartial({ systemPrompt: event.target.value })}
                  className="min-h-20 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                  placeholder="You are a concise coding assistant."
                />
              </div>

              <div className="mt-3 grid gap-1">
                <Label htmlFor="api-prompt">Prompt</Label>
                <textarea
                  id="api-prompt"
                  value={apiState.prompt}
                  onChange={(event) => setApiPartial({ prompt: event.target.value })}
                  className="min-h-24 w-full border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Button disabled={apiWorking || !apiStatus?.running} onClick={() => void sendLocalApiPrompt()}>
                  Send Test Request
                </Button>
              </div>

              {apiResponse ? (
                <div className="mt-3 border border-zinc-800 bg-zinc-900 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wider text-zinc-400">Response</p>
                  <pre className="whitespace-pre-wrap text-xs text-zinc-100">{apiResponse}</pre>
                </div>
              ) : null}
            </section>

            <section className="border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-2 text-sm text-zinc-100">cURL Example</p>
              <pre className="overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{curlExample}</pre>
            </section>

            {apiError ? <p className="text-xs text-red-400">{apiError}</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
