# Workspace validation record

Validation performed on branch **`chore/mobile-dev-workspace-v2`** (baseline `9184c72961b64e9870252b38bccdb7e0954c6929`).

## Toolchain

| Tool | Version |
|------|---------|
| Node.js | v24.19.0 (meets `engines` ≥ 20.19.4; recommended `.nvmrc` 20.19.4) |
| npm | 11.7.0 |
| Expo SDK | 54.0.35 (from `package.json`) |

## Dependency install

```bash
npm ci
```

- **Result:** success
- **postinstall:** `patch-package` — “No patch files found” (expected; no `patches/` directory)

## API configuration

```bash
npm run config:print
```

| `EDUVIJNA_API_ENV` | Resolved `extra.API_BASE_URL` |
|--------------------|-------------------------------|
| `development` | `https://dev-api.eduvijna.com` |
| `production` | `https://eduapi.eduvijna.com` |

Manual check (`npx expo config --type public --json` with `EDUVIJNA_API_ENV=development`):

- `extra.API_BASE_URL` = dev origin
- `extra.eas.projectId` preserved (`60acc689-aea1-4ce1-9770-4200c1c17c00`)
- `android.package` / `ios.bundleIdentifier` unchanged (`com.eduvijna.app`)

## Static analysis

```bash
npm run type-check
```

- **Result:** **fail** — extensive pre-existing TypeScript errors across screens, hooks, and API layers (not introduced by this setup branch).

```bash
npm run lint
```

- **Result:** **fail** — large pre-existing ESLint report (2213 lines); not weakened for this task.

## Tests

```bash
npm test -- --watch=false
```

| Suite | Result |
|-------|--------|
| `apiEnvironment.test.ts` (new) | **pass** (8 tests) |
| `sharedApi.assessments.test.ts` | pass |
| `CreateDocumentQuizScreen.test.tsx` | pass |
| `CreateHandwrittenQuizScreen.test.tsx` | pass |
| `assessmentWorkspace.store.test.ts` | **fail** (2) — expects `questionCount` 20, store default **5** (pre-existing) |

**Totals:** 1 failed suite, 4 passed; 2 failed tests, 110 passed.

## Metro / bundle

```bash
npm run bundle:android:development
```

- **Result:** **pass** — Android export to `.expo-export-check/android` (2131 modules).

**Not run / blocked:**

- Physical device or emulator session (no committed `android/` tree; native run requires local SDK + `expo run:android`)
- iOS build (Windows host)
- Full `expo start` interactive Metro session (bundle export validates config + bundling)

## API connectivity (non-mutating)

| Target | Check | Result |
|--------|-------|--------|
| `https://dev-api.eduvijna.com/openapi.json` | HTTP HEAD | **200** |

No authenticated calls, assessments, or device registration performed.

## Quiz-React reference (unchanged)

| Field | Value |
|-------|-------|
| HEAD | `86daec53a4fdbf06e3d7dd129b9ed6223affb370` |
| `git status` | clean except `main...origin/main [behind 8]` (not modified by this task) |

## Remaining risks

1. **Type-check / lint debt** — baseline fails; CI may not gate on these today.
2. **Node 24** — validated locally; team should align on LTS 20.19.4+ per `.nvmrc` if Expo issues appear.
3. **Codex review** — no Codex integration found in repository config; PR must request review manually if integration is added org-side.
4. **Development client** — `start:development` requires a dev build when using `--dev-client`; first-time native setup is operational overhead.
5. **Documentation drift** — legacy hostnames (`api.eduvijna.com`) remain in older Markdown and scripts; see `REPOSITORY_BASELINE.md`.
