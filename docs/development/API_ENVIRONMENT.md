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

Production bundle/OTA commands set `EDUVIJNA_REQUIRE_PRODUCTION=1` and `EDUVIJNA_API_ENV=production`. If the shell already has `EDUVIJNA_API_ENV=development`, the wrapper **exits with an error**.

## EAS builds

`eas.json` sets `EDUVIJNA_API_ENV` per profile:

| Profile | API environment |
|---------|-----------------|
| `development` | development |
| `preview` | production |
| `production` | production |

## OTA updates

`expo-updates` is enabled in `app.json`. **`eas update` does not inherit build-profile `env` automatically** — use the npm script so config-time env is production:

```bash
npm run update:production
```

This task does **not** publish updates. Publishing requires EAS login, project access, and Founder approval.

## Verification

```bash
npm run config:verify
npm run bundle:verify:development
npm run bundle:verify:production
```

## Runtime

`src/core/api/config.ts` reads `Constants.expoConfig.extra.API_BASE_URL` and throws if missing. There is no runtime fallback to production.
