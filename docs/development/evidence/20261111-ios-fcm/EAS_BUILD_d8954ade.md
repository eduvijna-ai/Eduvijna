# EAS iOS FCM TestFlight build — d8954ade (1.0.4 / 1.0.12)

## Authorization

- Founder authorization: single corrected startup-crash-fix build
- No auto-submit
- TestFlight upload: not authorized in this step

## Build result

| Field | Value |
|---|---|
| EAS Build ID | `d8954ade-23bf-4d3c-980d-19f446edffbd` |
| Status | FINISHED |
| Profile | `ios-fcm-testflight` |
| Platform | iOS (store) |
| App version | `1.0.4` |
| Build number | `1.0.12` (autoIncrement from remote `1.0.11`) |
| Runtime | `1.0.4-ios-fcm` |
| Source SHA | `8babdb92888c147c1f2c28cef4b22011dc4eb889` |
| Bundle ID | `com.eduvijna.app` |
| IPA | https://expo.dev/artifacts/eas/M5hg0M1klRw872u9eEckZEZ3we-meB5V0rx7LIuTPx4.ipa |
| Build URL | https://expo.dev/accounts/samathakotikanyadanam/projects/eduvijna/builds/d8954ade-23bf-4d3c-980d-19f446edffbd |
| Completed | 2026-11-12T01:10:30.919Z |

## Preflight checks (passed before build)

- Local HEAD = origin `feat/mobile-ios-fcm-notifications` = required SHA
- Worktree cleaned (unrelated local evidence temporarily stashed) then restored after build
- Remote iOS buildNumber was `1.0.11`; EAS incremented to `1.0.12`
- Production API / APS / team / Firebase file env verified
- PR #29 remained DRAFT

## Expected warnings (non-blocking)

- `ITSAppUsesNonExemptEncryption` not set in infoPlist (ASC manual config reminder)
- Local `GoogleService-Info.plist` not VCS-uploaded; production uses `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` EAS secret

## Not done

- TestFlight submit / ASC upload
- Physical iPhone retest
- PR merge / App Store release
