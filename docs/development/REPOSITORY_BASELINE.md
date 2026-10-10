# Repository baseline — mobile dev workspace

Captured during **chore/mobile-dev-workspace-v2** setup (Implementation Engineer). Schema and backend behavior are **repository evidence only** unless verified via an authorized backend source.

## Git baselines

| Repository | Remote | Branch (local) | HEAD SHA | Notes |
|------------|--------|----------------|----------|-------|
| **Eduvijna** | `https://github.com/eduvijna-ai/Eduvijna.git` | `chore/mobile-dev-workspace-v2` (from `main`) | `9184c72961b64e9870252b38bccdb7e0954c6929` | Matches `origin/main` at setup time |
| **Quiz-React** (reference) | `https://github.com/eduvijna-ai/Quiz-React.git` | `main` | `86daec53a4fdbf06e3d7dd129b9ed6223affb370` | Local `main` reported **behind origin/main by 8**; not fetched/updated (read-only) |

Prior local branch **`chore/mobile-workspace-setup`** existed at the same commit with unpublished workspace WIP; work continued on **`chore/mobile-dev-workspace-v2`** per task naming.

Unpublished paths on mobile checkout before commit (workspace task scope):

- `.env.example`, `.gitignore`, `.vscode/tasks.json`, `README.md`, `package.json`, `package-lock.json`, `tsconfig.json`

## Architecture summary (read docs + code)

- **Pattern:** Clean architecture — `src/core/` (API, hooks, store, services) vs `src/platforms/` and `src/screens/` (UI). ESLint enforces boundaries ([ARCHITECTURE.md](../../ARCHITECTURE.md), [ARCHITECTURE_DECISIONS.md](../../ARCHITECTURE_DECISIONS.md)).
- **Entry:** `App.tsx` — platform split (mobile `BottomTabNavigator`, web state machine), auth via `useAuth`, deep links, push hooks.
- **Navigation (mobile):** `src/platforms/mobile/navigation/BottomTabNavigator.tsx` ([NAVIGATION_FLOW.md](../../NAVIGATION_FLOW.md)).
- **HTTP:** Axios `apiClient` in `src/core/api/config.ts`; parallel fetch client in `src/core/services/dashboardApi.ts` with `DASHBOARD_API_URL = \`${API_BASE_URL}/api/v1\``.
- **Tokens:** `src/core/services/tokenStorage.ts` — web localStorage, mobile AsyncStorage (+ SecureStore for refresh).
- **Cache:** `src/core/services/cacheService.ts` — memory + AsyncStorage only (ADR-006); **no Redis client in app**.
- **Shared assessments API:** `src/core/services/sharedApi.ts` uses `apiClient` paths under `/api/v1/...`.

## API configuration (traced)

### Before setup

```21:21:src/core/api/config.ts
export const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'https://eduapi.eduvijna.com';
```

```94:96:app.json
    "extra": {
      "API_BASE_URL": "https://eduapi.eduvijna.com",
```

- `.env.example` (on `main`) referenced **`EXPO_PUBLIC_API_URL`**, which was **not** consumed by `config.ts`.
- **Result:** Metro/dev defaulted to **production** origin unless `app.json` was edited manually.

### After setup (this branch)

- **`EDUVIJNA_API_ENV`** → `app.config.ts` → `expo.extra.API_BASE_URL`
- Runtime: `config.ts` validates `extra.API_BASE_URL` (no silent production fallback)
- Optional **`EXPO_PUBLIC_API_BASE_URL`**: development-only origin override

### Hardcoded / legacy origins (documented, not all changed)

| Location | Finding |
|----------|---------|
| `src/examples/AuthErrorHandling.example.tsx` | Example fetch to production login URL |
| `scripts/testPushNotification.js`, `scripts/testDeviceRegistration.js` | `https://api.eduvijna.com` (legacy hostname) |
| Various Markdown (`API_BASE_URL_CENTRALIZATION.md`, `BACKEND_API_INTEGRATION.md`, caching guides) | References to `api.eduvijna.com` or `EXPO_PUBLIC_API_URL` |
| `src/core/api/erp.api.ts` comment | Documents production host in comment only |

Active app paths use `API_BASE_URL` or `apiClient` except the example/scripts above.

## Documentation contradictions (setup-relevant)

| Topic | Sources | Conflict |
|-------|---------|----------|
| API base URL | `API_BASE_URL_CENTRALIZATION.md` vs `app.json` / code | Doc fallback `api.eduvijna.com`; runtime uses `eduapi.eduvijna.com` |
| Env vars | `ONBOARDING_GUIDE.md`, `ARCHITECTURE.md` vs `config.ts` | Docs describe `EXPO_PUBLIC_API_URL`; app did not read it |
| BUILD_NATIVE_APP.md | Filename vs content | File content is **Firebase FCM** instructions, not a general native build index |
| Redis | Older caching Markdown vs ADR-006 / SKILLS | Some docs imply Redis in app; code uses AsyncStorage + memory only |
| patch-package | SKILLS.md, ONBOARDING | `postinstall` runs patch-package but **no `patches/`** directory in baseline |
| Quiz-React | N/A | Browser same-origin API patterns must **not** be copied into native mobile networking |

## Schema / API evidence limits

- Endpoint list and shapes in [DATABASE_AND_API_MAP.md](../../DATABASE_AND_API_MAP.md) are derived from **call sites in this repo**, not live OpenAPI verification.
- E2E fixture JSON under `docs/development/e2e-fixtures/` references `dev-api` but may contain environment-specific IDs; treat as samples.

## Mobile operations boundary

All production data access must go through **HTTPS backend APIs** (`dev-api.eduvijna.com` / `eduapi.eduvijna.com`). No direct database, Redis, Pinecone, or LLM provider connections from the mobile app.
