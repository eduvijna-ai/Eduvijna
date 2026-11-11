# iOS FCM — Founder configuration handoff

Mobile code for iOS Firebase Cloud Messaging lives on `feat/mobile-ios-fcm-notifications`.
This document lists **Founder / Apple / Firebase Console** actions that cannot be completed without credentials.

## Firebase project (do not recreate)

- Project ID: `eduvijna-push`
- Project number / sender ID: `416066207556`
- Android production package (unchanged): `com.eduvijna.app`
- iOS production bundle: `com.eduvijna.app`

## 1. Authenticate Firebase tooling

Cursor Firebase MCP / CLI must be signed in as an account with access to `eduvijna-push`.

Then from the iOS feature worktree:

```bash
node scripts/provision-ios-firebase-app.mjs
```

This reuses an existing iOS app for `com.eduvijna.app` or registers one once, then writes `GoogleService-Info.plist` (metadata only is logged).

Optional EAS injection if the plist is not committed:

1. Store the plist as an EAS file environment variable / secret named for `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE`.
2. Point production / preview / `ios-fcm-preview` builds at that file path.
3. Never upload APNs `.p8` keys into the mobile repository.

## 2. Apple Developer + APNs (required for delivery)

Firebase MCP/CLI **cannot** read whether an APNs auth key is already configured.
An authorized Apple Developer / Firebase administrator must verify in Console.

### Exact Console steps

1. **Apple Developer** → Certificates, Identifiers & Profiles → Identifiers → `com.eduvijna.app`
   - Enable **Push Notifications** capability → Save.
2. **Apple Developer** → Keys → "+" → enable **Apple Push Notifications service (APNs)** → Continue → Register.
   - Download the `.p8` once; record **Key ID** and your **Team ID**.
3. **Firebase Console** → project `eduvijna-push` → ⚙️ Project settings → **Cloud Messaging** tab.
4. Under **Apple app configuration** for the iOS app `com.eduvijna.app`:
   - **APNs authentication key** → Upload
   - Select the `.p8`, enter Key ID + Team ID → Upload
5. EAS / Apple provisioning profiles for this App ID must include Push Notifications.
6. Mobile config maps `aps-environment` by EAS profile (`development` → development; production/preview/ios-fcm-preview → production).
7. Background mode `remote-notification` is declared in Expo config.

**Do not** paste `.p8` contents into chat, git, or EAS public env vars.
Firebase MCP has no approved API to inspect APNs private-key material.

## 3. Google Sign-In — separate scope

Firebase may suggest “Set up and use Google Sign-in.”

EduVijna already authenticates via **backend JWT login**. Google Sign-In is **not** required for FCM.

Out of scope for the iOS FCM PR:

- Enabling Firebase Auth Google provider for mobile login
- Replacing JWT session handling
- Adding Google Sign-In UI

If desired later: open a separate feature proposal covering Apple URL schemes / `REVERSED_CLIENT_ID`, backend identity federation contract, and account linking.

## 4. Authorized builds (separate Founder approval)

Do **not** start these until code review + Founder authorization:

1. EAS iOS build from verified main SHA after merge (or authorized pre-merge TestFlight candidate).
2. TestFlight internal validation on a physical iPhone.
3. App Store submission.

Record the exact Git SHA on every build.

## 5. Physical acceptance checklist

- App launches and JWT login works
- User grants notification permission (once)
- Firebase returns an FCM registration token (not APNs hex, not Expo token)
- Backend `POST /api/notifications/devices` accepts `platform: ios`
- iPhone displays assignment / completion / graded / announcement notifications
- Tap navigates correctly (foreground, background, cold start, signed-out → login resume)
- Android regression remains clear
