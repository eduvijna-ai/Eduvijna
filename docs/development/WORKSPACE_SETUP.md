# Mobile development workspace setup

This guide configures a reproducible Eduvijna mobile/web development environment with an optional **Quiz-React** sibling checkout for read-only reference.

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| **Node.js** | ≥ **20.19.4** (see `.nvmrc` and `package.json` `engines`) |
| **npm** | ≥ **10** (use `npm ci` with the committed lockfile) |
| **Git** | Clone Eduvijna and (optionally) Quiz-React as siblings |
| **Android** | Android Studio, SDK 36, emulator or USB device (for `expo run:android`) |
| **iOS** | macOS + Xcode 15+ (for `expo run:ios`) |
| **EAS CLI** | Optional; not required for local Metro/web work |

Expo SDK **54** / React Native **0.81.5** — do not upgrade Expo/RN as part of routine setup.

## Checkout structure

Recommended sibling layout:

```
dev/
├── Eduvijna/                 ← implementation (this repo)
└── Quiz-React/               ← reference only (no commits from mobile setup)
```

1. Clone **Eduvijna**: `https://github.com/eduvijna-ai/Eduvijna.git`
2. Clone **Quiz-React** beside it: `https://github.com/eduvijna-ai/Quiz-React.git`
3. Open **`Eduvijna-MobileApps.code-workspace`** in Cursor/VS Code.

**Quiz-React restriction:** do not modify, commit, push, format, or run install/fix commands in Quiz-React during mobile implementation work.

## Install dependencies

```bash
cd Eduvijna
node -v    # expect >= 20.19.4
npm ci
```

- `postinstall` runs **`patch-package`**. There is no `patches/` directory in the current baseline; the hook is a no-op until patches are added.
- Preserved toolchain customizations: Babel aliases + React Native shim (`babel.config.js`), Metro axios browser build, Zustand CJS on web, jest watcher block list (`metro.config.js`).

## API environment selection

**Problem (before this setup):** `app.json` always set `expo.extra.API_BASE_URL` to production (`https://eduapi.eduvijna.com`), while `.env.example` documented `EXPO_PUBLIC_API_URL`, which **`src/core/api/config.ts` did not read**. Local Metro therefore always talked to production unless manually editing `app.json`.

**Mechanism (one source):** environment variable **`EDUVIJNA_API_ENV`**

| Value | API origin (`expo.extra.API_BASE_URL`) |
|-------|----------------------------------------|
| `development` | `https://dev-api.eduvijna.com` |
| `production` | `https://eduapi.eduvijna.com` |

Flow:

1. `app.config.ts` reads `EDUVIJNA_API_ENV` (and optional dev-only `EXPO_PUBLIC_API_BASE_URL` override).
2. Resolved origin is written to **`expo.extra.API_BASE_URL`** (origin only — **no** `/api/v1`).
3. `src/core/api/config.ts` reads `Constants.expoConfig.extra.API_BASE_URL` and throws if missing/invalid.
4. Services such as `dashboardApi.ts` append `/api/v1` as before.

Invalid or missing `EDUVIJNA_API_ENV` causes **Expo config evaluation to fail** — no silent fallback to production.

Copy `.env.example` → `.env` for local defaults (`EDUVIJNA_API_ENV=development`). Never commit `.env`. Do not put secrets in `EXPO_PUBLIC_*` or Expo `extra`.

## Commands

### Development (explicit dev API)

```bash
npm run start:development      # Metro + dev client → dev-api
npm run start:development:clear
npm run web:development        # Web preview → dev-api (does not validate native)
npm run android:development    # Native run → dev-api (requires Android toolchain)
npm run ios:development        # macOS only
```

### Production-profile local runs

```bash
npm run start:production
npm run web
npm run android
npm run ios
npm run bundle:android
```

### Validation

```bash
npm run type-check
npm run lint
npm test -- --watch=false
npm run config:print           # prints resolved API_BASE_URL for dev/prod
```

### E2E fixture probe (optional, credentials in .env — never commit)

```bash
npm run probe:e2e-fixtures
```

## Development client

`eas.json` defines a **development** profile with `developmentClient: true`. The app depends on **`expo-dev-client`** for `start:development`. If no development build is installed on device/emulator, use `npm run android:development` / EAS development build once, then attach Metro with `start:development`.

There is **no committed `android/` or `ios/`** tree in the baseline repo; native projects are produced by `expo prebuild` / `expo run:*` when needed.

## Agent / review workflow

- Implementation changes: **Eduvijna only** — see [AGENTS.md](../../AGENTS.md) and `.cursor/rules/mobile-dev-workspace.mdc`.
- Record baseline and validation evidence in [REPOSITORY_BASELINE.md](./REPOSITORY_BASELINE.md) and [WORKSPACE_VALIDATION.md](./WORKSPACE_VALIDATION.md).
- Hand off via PR to `main`; request Codex review when the integration is configured.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Expo fails immediately on start | Export `EDUVIJNA_API_ENV=development` or use npm scripts above |
| App still hits production | Restart Metro after env change; run `npm run config:print` |
| `Missing expo.extra.API_BASE_URL` at runtime | Ensure `app.config.ts` is used (not static `app.json` only) |
| Metro watch crash on Windows | See jest package block list in `metro.config.js` |
| patch-package errors | Ensure `npm ci` completed; add missing patch files if introduced on branch |
