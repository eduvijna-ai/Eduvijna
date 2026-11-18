# Evidence: mobile login redesign, launcher icon, school header logo

Branch: `feat/mobile-login-icon-school-branding`  
Worktree: `D:\wt\eduvijna-mobile-login-icon-branding`

## Changes

1. **Login** — pale-teal school-themed header with stacked transparent mark; white form with persistent labels and dark-teal Sign in.
2. **Launcher icons** — stacked book + EduVijna wordmark, dark teal on white; Android adaptive FG transparent + `#FFFFFF` background; generator reproduces assets.
3. **Home header** — school `logo_url` from `GET /api/v1/school-management/my-school` in the EduVijna wordmark slot; session-scoped with cache-bust revision; EduVijna fallback.

## Unit tests

```text
npx jest src/__tests__/schoolBranding.test.ts src/__tests__/useAuth.lifecycle.test.ts src/__tests__/authLifecycle.policy.test.ts --forceExit --runInBand
```

Result: **22 passed** (includes same-URL revision bump + account-isolation stale rejection).

## Icon mask previews

- `android-launcher-preview-square.png`
- `android-launcher-preview-circle.png` (safe-zone check: insideSafe=true)

## Native verification

See `VERIFICATION.md` (filled during build/install pass).
