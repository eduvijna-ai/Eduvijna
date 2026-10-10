# Agent guide — Eduvijna Mobile (implementation repository)

This repository is the **Eduvijna cross-platform mobile/web app** (Expo SDK 54). It is the only repo where agents may commit implementation changes for mobile work.

## Workspace layout

| Folder (workspace) | Path (sibling checkout) | Role |
|--------------------|-------------------------|------|
| **Eduvijna Mobile** | This repo | Implement, test, commit |
| **Quiz-React Reference** | `../Quiz-React` | Read-only reference for web parity |

Open `Eduvijna-MobileApps.code-workspace` in Cursor/VS Code. **Do not** modify, commit, push, or run fix/format/upgrade commands in Quiz-React.

## Architecture boundaries (non-negotiable)

- Business logic and HTTP live under `src/core/`. UI lives under `src/platforms/` and `src/screens/`.
- **All data access goes through backend HTTPS APIs.** No direct Postgres, Redis, Pinecone, or LLM provider connections from the app.
- ESLint enforces clean architecture; do not disable rules to pass checks.
- Source code is the authority for runtime behavior; older Markdown may contradict code — record contradictions in `docs/development/REPOSITORY_BASELINE.md`.

## API environment selection

Single mechanism: **`EDUVIJNA_API_ENV`** (`development` | `production`).

- `app.config.ts` resolves the origin and sets `expo.extra.API_BASE_URL` (origin only, no `/api/v1`).
- Runtime reads `Constants.expoConfig.extra.API_BASE_URL` in `src/core/api/config.ts`.
- Invalid or missing `EDUVIJNA_API_ENV` **throws at config or startup** — no silent production fallback.
- Development work must use `npm run start:development`, `npm run web:development`, or `npm run android:development`.

See `docs/development/WORKSPACE_SETUP.md`.

## Development workflow

1. `npm ci` (Node ≥ 20.19.4 per `.nvmrc` / `package.json` engines).
2. Select development explicitly for day-to-day work.
3. Validate: `npm run type-check`, `npm run lint`, `npm test -- --watch=false`.
4. Native Android/iOS requires local SDKs and a **development build** when using dev client (`expo-dev-client`); web preview does not validate native behavior.

## Review handoff

- Scope setup/docs/config tasks separately from feature work.
- Open PRs against `main` unless directed otherwise; request **Codex** review via the repo integration when available.
- Do not merge, deploy, EAS publish, or store-submit without Founder approval.

## Key references

- `ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`, `SKILLS.md`
- `DATABASE_AND_API_MAP.md`, `API_BASE_URL_CENTRALIZATION.md`, `NAVIGATION_FLOW.md`
- `docs/development/WORKSPACE_SETUP.md`, `REPOSITORY_BASELINE.md`, `WORKSPACE_VALIDATION.md`
