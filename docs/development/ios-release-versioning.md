# iOS release versioning

## Two different version fields

| Field | Apple name | Source of truth | How it advances |
|---|---|---|---|
| **Marketing version** | `CFBundleShortVersionString` | `app.json` → `expo.ios.version` | Explicit only: `npm run release:ios:prepare` |
| **Build number** | `CFBundleVersion` | EAS remote (`cli.appVersionSource=remote`) | Automatic: `ios-fcm-testflight.autoIncrement=true` |
| **iOS runtime** | Expo Updates runtime | `app.json` → `expo.ios.runtimeVersion` | Always `{marketing}-ios-fcm` via prepare + policy module |

Android root `expo.version` / `expo.runtimeVersion` stay on `1.0.0` and are never changed by the iOS prepare workflow.

## Prepare a new marketing train

```bash
# Patch bump (e.g. 1.0.4 → 1.0.5) and set runtime 1.0.5-ios-fcm
npm run release:ios:prepare

# Or set explicitly (prefer --flag=value so npm does not swallow args on Windows)
npm run release:ios:prepare -- --set=1.0.5

# Dry-run + uniqueness check against predicted next remote build
npm run release:ios:prepare -- --dry-run --expect-remote-build=1.0.12

# Equivalent direct invocation
node scripts/prepare-ios-release.mjs --dry-run --expect-remote-build=1.0.12
```

The prepare command:

- Updates `app.json` iOS marketing + runtime only
- Rejects invalid / downgraded versions
- Does **not** hardcode the next build number
- Does **not** start an EAS build or Apple submit

## Build

After commit + Founder authorization:

```powershell
eas build --platform ios --profile ios-fcm-testflight --non-interactive
```

Confirm EAS prints `Incrementing buildNumber from X to Y` where Y is the expected next remote value.

## App Store Connect

ASC duplicate / processing status cannot be inferred from the Expo Builds page. Confirm in ASC (or approved ASC tooling) before TestFlight upload.
