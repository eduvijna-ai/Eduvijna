# iOS FCM — Founder configuration handoff

Mobile code for iOS Firebase Cloud Messaging lives on `feat/mobile-ios-fcm-notifications` (Draft PR #29).

## Screenshot-confirmed (Founder completed)

| Item | Status |
|------|--------|
| Firebase project `eduvijna-push` / `416066207556` | Confirmed |
| iOS app `EduVijna iOS` / `com.eduvijna.app` | Registered |
| Apple Team `847JWGJ2VM` | Confirmed |
| App Store ID `6807368682` | Confirmed |
| FCM HTTP v1 | Enabled |
| Firebase development APNs auth key | Uploaded |
| Firebase production APNs auth key | Uploaded |
| Apple Developer sandbox + production APNs keys | Exist (team-scoped) |
| Legacy Expo Push Notifications Apple key | Leave untouched |

These confirm Console setup — **not** native iPhone receipt.

## GoogleService-Info.plist

- Real file is **gitignored** at `./GoogleService-Info.plist`.
- Sanitized template: `GoogleService-Info.example.plist`.
- Local Founder backup (gitignored): `.local/GoogleService-Info.plist.founder-download`.
- EAS injection instructions: `docs/development/IOS_FCM_EAS_FILE_INJECTION.md`.

## Apple App ID Push capability — UNVERIFIED by agent

Screenshots prove APNs **keys**, not App ID capability / provisioning.

Founder verify in Apple Developer:

1. Certificates, Identifiers & Profiles → Identifiers → `com.eduvijna.app`
2. Confirm **Push Notifications** is enabled → Save if needed
3. Profiles used by EAS for this App ID must include Push Notifications
4. Development / ad-hoc vs App Store profiles must match the intended `aps-environment`

## Recommended physical iPhone acceptance path

Prefer **TestFlight** for `com.eduvijna.app`:

| Concern | Recommendation |
|---------|----------------|
| Bundle ID | Keep `com.eduvijna.app` (no second Firebase/iOS app) |
| APNs | Production keys already in Firebase → use distribution signing |
| EAS profile | `ios-fcm-testflight` (store distribution, production API, production APNs entitlement) |
| API | Production `https://eduapi.eduvijna.com` — use **narrowly scoped test users** only |
| Alternate | `ios-fcm-preview` = internal distribution + production API (ad-hoc); still production APNs entitlement in config, but not TestFlight |

Do **not** assume APNs Sandbox means DEV API. Sandbox vs production is a signing/APNs concern; API env is independent.

## Authorized builds (separate Founder approval)

Do **not** start until explicit authorization:

1. Create EAS file env `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` (see injection doc)
2. EAS iOS build from this feature SHA or post-merge main SHA
3. TestFlight internal validation on a physical iPhone
4. App Store submission (later)

Record the exact Git SHA on every build.

## Google Sign-In

Out of scope. See `GOOGLE_SIGNIN_SEPARATE_SCOPE.md`.
