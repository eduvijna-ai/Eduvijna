# API environment selection

Mobile and web clients use **backend HTTPS APIs only**. API host selection is explicit — not inferred from `NODE_ENV` or `__DEV__`.

## Selector

| Variable | Values |
|----------|--------|
| `EDUVIJNA_API_ENV` | `development` · `production` |

| Environment | Origin (`expo.extra.API_BASE_URL`) |
|-------------|-----------------------------------|
| `development` | `https://dev-api.eduvijna.com` |
| `production` | `https://eduapi.eduvijna.com` |

Origins have **no** `/api/v1` suffix. Services (e.g. `dashboardApi.ts`) append `/api/v1` as today.

## Local behavior

- **Ordinary commands** (`npm start`, `npm run android`, `npm run ios`, `npm run web`): if `EDUVIJNA_API_ENV` is unset, `app.config.ts` defaults to **development**.
- **Invalid** `EDUVIJNA_API_ENV`: Expo config evaluation **throws** (no silent production fallback).
- **Production local run:** `npm run start:production` sets production explicitly.

## Production release guard

Production bundle/OTA commands use `scripts/with-eduvijna-api-env.mjs` in **`production-release`** mode. It parses any non-empty inherited `EDUVIJNA_API_ENV` first, rejects **development** (any casing/padding) and **invalid** values, then sets `EDUVIJNA_REQUIRE_PRODUCTION=1` and `EDUVIJNA_API_ENV=production` before spawning the child process.

## EAS builds

`eas.json` sets `EDUVIJNA_API_ENV` per profile:

| Profile | API environment |
|---------|-----------------|
| `development` | development |
| `preview` | production |
| `production` | production |

## OTA updates

`expo-updates` is enabled in `app.json`. **`eas update` does not inherit build-profile `env` automatically** — use:

```bash
npm run update:production
```

**Production OTA publication remains blocked** until EAS **channel/branch** and **environment policy** are verified with the account owner. Do not run `update:production` or publish from this repo without Founder approval.

## CLI wrapper (Expo + EAS)

`scripts/with-eduvijna-api-env.mjs` runs child processes with **`stdio: 'inherit'`** and **`shell: false`**.

| Command | Resolution |
|---------|------------|
| `expo …` | `node node_modules/expo/bin/cli …` |
| `eas …` | `node` + local **`eas-cli@16.27.0`** (devDependency — run **`npm ci`** if missing) |

Do not invoke `expo.cmd` / `eas.cmd` shims from the wrapper — paths with spaces break under piped stdio.

**`npm run update:production`** and **`npm run cli:verify`** always use the pinned local `eas-cli` via the wrapper.

## Verification

```bash
npm run config:verify
npm run cli:verify
npm run bundle:verify:development
npm run bundle:verify:production
npm test -- --watch=false src/__tests__/withEduvijnaApiEnv.wrapper.test.ts
npm test -- --watch=false src/__tests__/resolveCliEntry.test.ts
```

`config:verify` clears inherited `EDUVIJNA_API_ENV` / `EDUVIJNA_REQUIRE_PRODUCTION` before the default-development Expo check.

`cli:verify` runs `eas --version` through the wrapper (non-publishing).

## Runtime

`src/core/api/config.ts` reads `Constants.expoConfig.extra.API_BASE_URL` and throws if missing. There is no runtime fallback to production.

## Review handoff (Quiz-React reference)

| Reference | Commit | Notes |
|-----------|--------|--------|
| **Deployed web reference** | `31ae140f50ccc79079cdfc8c28f2c2d03b60fde7` | From Quiz-React **PR #325** — use for parity reads |
| **Quiz-React `origin/main` (current remote tip)** | `21f9a1d077cfa93341dfd325579cb119085857cf` (fetched during PR #16 correction) | Differs from deployed reference — not the deployed web baseline |

Use a **separate read-only git worktree** at the deployed reference commit; **preserve** the existing sibling `Quiz-React` checkout (do not reset or commit there):

```bash
git -C ../Quiz-React fetch origin
git -C ../Quiz-React worktree add ../Quiz-React-Deployed-Reference 31ae140f50ccc79079cdfc8c28f2c2d03b60fde7
```

## Codex review

Codex integration is **confirmed working** — request review on the Eduvijna PR via `@codex review` in PR conversation.
