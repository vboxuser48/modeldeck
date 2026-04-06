# ModelDeck

ModelDeck is a cross-platform desktop AI workspace built for local-first development workflows.
It combines an Electron desktop shell, a Next.js renderer, and a Python FastAPI local API service over Ollama.

## Highlights

- Local-first AI workflow with Ollama model runtime.
- Session-based chat workspace with model selection, compare mode, and persistence.
- Built-in local API mode (`/generate`) for integrating prompts into external tools.
- Installable desktop builds for Linux, Windows, and macOS.
- Cross-platform CI validation and release packaging pipeline.

## Tech Stack

- Desktop shell: Electron
- Renderer: Next.js + React + Tailwind CSS
- State management: Zustand
- Local AI runtime: Ollama
- Local API service: FastAPI (Python)
- Testing: Vitest + Playwright
- Packaging: electron-builder
- CI/CD: GitHub Actions

## Architecture

ModelDeck follows a split-process desktop architecture:

1. Electron main process:
- Manages app lifecycle and window creation.
- Hosts IPC handlers for Ollama, sessions, system telemetry, and local API controls.

2. Electron preload bridge:
- Exposes a typed, secure API surface to the renderer via `contextBridge`.

3. Renderer app (Next.js):
- Implements UI, workspace interactions, and session orchestration.
- Uses Zustand stores for application state.

4. Python FastAPI service:
- Runs local-only (`127.0.0.1`) endpoint for `/generate` requests.
- Forwards prompt generation requests to Ollama.

## Repository Structure

Top-level directories:

- `electron/`: Electron main/preload and IPC handlers.
- `renderer/`: Next.js renderer app and UI components.
- `python/`: FastAPI local API service.
- `.github/workflows/`: CI and release automation.

## Prerequisites

- Node.js `22.x` (see [.nvmrc](.nvmrc))
- npm `10.x+`
- Python `3.11` (see [.python-version](.python-version))
- Ollama installed and available in PATH

Optional but recommended:

- `nvm` / `fnm` for Node version management
- Python virtual environment for local backend development

## Environment Configuration

Use [.env.example](.env.example) as reference.

Supported variables:

- `MODELDECK_API_PORT` (default: `8765`)
- `MODELDECK_API_DEFAULT_MODEL` (default: `llama3.1:8b`)
- `MODELDECK_OLLAMA_URL` (default: `http://127.0.0.1:11434`)

Create local environment file:

```bash
cp .env.example .env
```

## Quick Start

1. Install dependencies:

```bash
npm ci
python -m pip install -r python/requirements.txt
```

2. Start renderer + Electron in development:

```bash
npm run dev
```

Linux note: If your system requires sandbox bypass during development:

```bash
ELECTRON_DISABLE_SANDBOX=1 npm run dev:electron
```

## NPM Scripts

- `npm run dev`: Run renderer + Electron in dev mode.
- `npm run dev:renderer`: Start Next.js renderer dev server.
- `npm run dev:electron`: Start Electron against existing renderer server.
- `npm run build`: Build renderer and Electron.
- `npm run build:renderer`: Build Next.js renderer.
- `npm run build:electron`: Compile Electron TypeScript.
- `npm test`: Run unit tests (Vitest).
- `npm run test:e2e`: Run Playwright smoke tests.
- `npm run test:e2e:headed`: Run Playwright with visible browser.
- `npm run test:ci`: Build + unit tests + e2e tests.
- `npm run dist`: Package app for current OS.
- `npm run dist:linux`: Build Linux AppImage.
- `npm run dist:win`: Build Windows NSIS installer.
- `npm run dist:mac`: Build macOS DMG.

## Testing Strategy

ModelDeck uses layered validation:

1. Unit tests (Vitest) for business logic and utilities.
2. End-to-end smoke tests (Playwright) for critical user paths:
- workspace loads
- settings page loads
- model library loads
3. Build validation for renderer and Electron on every release path.

Relevant config:

- [playwright.config.ts](playwright.config.ts)
- [vitest.config.ts](vitest.config.ts)
- [tests/e2e/smoke.spec.ts](tests/e2e/smoke.spec.ts)

## Packaging & Distribution

Packaging is configured with electron-builder for:

- Linux: `AppImage`
- Windows: `NSIS (.exe)`
- macOS: `DMG`

Output directory:

- `release/`

Primary config:

- [electron-builder.yml](electron-builder.yml)
- [package.json](package.json) (`build` field)

## CI/CD Workflows

Two GitHub Actions workflows are included:

1. Cross-platform validation:
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- Runs on Linux, Windows, and macOS
- Executes lint, build, unit tests, and e2e smoke tests

2. Release packaging:
- [.github/workflows/release.yml](.github/workflows/release.yml)
- Validates on all OS runners
- Builds installers for all target OS
- Uploads artifacts and draft release assets on version tags

## Release Process

1. Ensure all changes are committed.
2. Create and push a semantic version tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. Monitor GitHub Actions release workflow.
4. Download installers from:
- Workflow artifacts
- Draft GitHub Release assets

## Signing & Notarization

For production-grade distribution, configure signing:

- Windows code-signing certificate
- macOS Developer ID signing and notarization

Common secrets:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

## Runtime Data Locations

ModelDeck stores data in OS-safe user directories:

- Linux/macOS: `~/.modeldeck/`
- Windows: `%APPDATA%/ModelDeck/`

Subdirectories include:

- `config/`
- `cache/`
- `logs/`

## Security Notes

- Local API mode binds to `127.0.0.1` only.
- No remote exposure by default.
- Secrets should never be committed to source control.
- Keep `.env` local and use `.env.example` as template.

## Troubleshooting

1. `npm run dev` fails on Linux sandbox:
- Use `ELECTRON_DISABLE_SANDBOX=1 npm run dev:electron`

2. No models listed:
- Ensure Ollama is installed and running.

3. Local API fails to start:
- Verify Python version and dependencies in `python/requirements.txt`.
- Check logs under OS-specific ModelDeck logs directory.

4. Engine warnings from npm:
- Use Node version from [.nvmrc](.nvmrc).

## Contributing

1. Create a feature branch.
2. Run validation locally:

```bash
npm run build
npm test
npm run test:e2e
```

3. Open a pull request.

## License

Add your project license information here (for example: MIT).
