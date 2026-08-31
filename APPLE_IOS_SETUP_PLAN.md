# EduVijna — Apple iOS Setup Plan

Step-by-step plan to ship EduVijna on iOS the same way it already works on Android (Google Play).

**App identity (already in repo):**

| Item | Value |
|------|--------|
| Bundle ID / package | `com.eduvijna.app` |
| Expo slug | `eduvijna` |
| Display name | EduVijna |
| Expo / EAS owner | `samathakotikanyadanam` |
| EAS project ID | `60acc689-aea1-4ce1-9770-4200c1c17c00` |
| Expo SDK | ~54 |
| API | `https://eduapi.eduvijna.com` |
| Deep link host | `app.eduvijna.com` |
| Custom scheme | `eduvijna://` |

**Important:** This is one Expo app (shared JS). You do **not** rewrite for iOS. You add Apple accounts, EAS iOS builds, TestFlight, then push + Universal Links for full parity with Android.

**Environment note:** On Windows you cannot build iOS locally with Xcode. Use **EAS cloud builds** (`eas build -p ios`).

---

## Big picture

| Android (already done) | iOS (this plan) |
|------------------------|-----------------|
| Google Play Console | App Store Connect |
| AAB / APK | IPA |
| Firebase Android + FCM | Firebase iOS + APNs |
| App Links | Universal Links (+ custom scheme already configured) |
| `eas build -p android` | `eas build -p ios` |

---

## Phase 0 — Concepts (quick glossary)

| Term | Meaning |
|------|---------|
| **Expo** | React Native framework used by this app |
| **EAS** | Expo Application Services — cloud builds, credentials, store submit |
| **Bundle ID** | iOS app ID — `com.eduvijna.app` (must match `app.json`) |
| **Apple Developer Program** | Paid Apple membership (~$99/year) required for device / store distribution |
| **Certificates & provisioning** | Apple signing files; EAS can create and manage them |
| **TestFlight** | Apple beta installs (like internal Play testing) |
| **APNs** | Apple Push Notification service |
| **Universal Links** | `https://app.eduvijna.com/...` opens the app on iOS |

---

## Phase 1 — Accounts and access

### 1.1 Apple ID + Developer Program

- [ ] Create or use an Apple ID
- [ ] Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
- [ ] Wait until membership status is **Active**
- [ ] Note **Team ID** (Developer account → Membership details)

### 1.2 App Store Connect

- [ ] Open [App Store Connect](https://appstoreconnect.apple.com/)
- [ ] Confirm access with Admin / Account Holder role
- [ ] Confirm you can create apps under the correct team

### 1.3 Expo / EAS account

- [ ] Log in as (or get invited to) Expo owner `samathakotikanyadanam`
- [ ] Confirm project `eduvijna` / project ID `60acc689-aea1-4ce1-9770-4200c1c17c00`
- [ ] Confirm EAS plan / build minutes are enough for iOS + Android releases

### 1.4 Ownership checklist

Decide and document who owns:

- [ ] Apple Developer login + 2FA
- [ ] Expo / EAS login
- [ ] Firebase project `eduvijna-push` admin
- [ ] DNS / hosting for `app.eduvijna.com` (AASA file)
- [ ] App Store review submission

---

## Phase 2 — Create the iOS app in Apple systems

### 2.1 Register App ID (bundle ID)

- [ ] Go to [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
- [ ] Create App ID (type: App)
- [ ] Bundle ID: **`com.eduvijna.app`** (exact match to `app.json`)
- [ ] Enable **Push Notifications** (needed for Android parity)
- [ ] Enable **Associated Domains** (needed for Universal Links)

### 2.2 Create app in App Store Connect

- [ ] My Apps → **+** → New App
- [ ] Platform: **iOS**
- [ ] Name: EduVijna (or final store name)
- [ ] Bundle ID: `com.eduvijna.app`
- [ ] SKU: e.g. `eduvijna-ios`
- [ ] Copy numeric **Apple ID** / App Store ID from the app page  
      → later replace placeholders `id123456789` in:
      - `src/core/services/deepLinkService.ts`
      - `src/core/components/WebDeepLinkHandler.tsx`

---

## Phase 3 — Tools on the PC (Windows OK)

From the repo root:

```bash
cd d:\eduvijna\Eduvijna
npm install
npm install -g eas-cli
eas login
eas whoami
eas project:info
npx expo-doctor
```

- [ ] `eas whoami` shows the correct Expo account
- [ ] `eas project:info` shows EduVijna / correct project ID
- [ ] Fix any critical `expo-doctor` issues before first iOS build

---

## Phase 4 — First iOS build + TestFlight

Goal: install the app on a real iPhone and verify core flows. Push / Universal Links can follow.

### 4.1 Start EAS iOS build

Production:

```bash
eas build -p ios --profile production
```

Internal / preview (optional first):

```bash
eas build -p ios --profile preview
```

During the interactive flow:

- [ ] Sign in to Apple when prompted (Apple ID + password + 2FA)
- [ ] Allow EAS to create/manage distribution certificate + provisioning profile
- [ ] Wait for cloud build (often 15–40 minutes)
- [ ] Confirm build succeeded on [expo.dev](https://expo.dev) and an `.ipa` was produced

If credentials fail, inspect/reset:

```bash
eas credentials -p ios
```

Common causes: inactive membership, missing App ID, wrong team, 2FA issues.

### 4.2 Submit to TestFlight

```bash
eas submit -p ios --latest
```

- [ ] Answer export compliance (usually standard HTTPS only / no custom encryption)
- [ ] Wait for Apple processing in App Store Connect → TestFlight

### 4.3 Invite testers and QA

- [ ] Add internal testers in TestFlight
- [ ] Install **TestFlight** on iPhone → install EduVijna
- [ ] Smoke-test:
  - [ ] Login
  - [ ] Main dashboards / quizzes / ERP flows you care about
  - [ ] Camera + photo library (document / handwritten quiz)
  - [ ] PDF / sharing if used
  - [ ] Custom scheme `eduvijna://...`

**At end of Phase 4:** same JS app runs on iOS. Push and HTTPS deep links may still not match Android.

---

## Phase 5 — Push notifications on iOS (parity with Android)

### Current repo reality

Push is **Android-only** in code today:

- `src/core/services/PushNotificationService.ts` → `isPushSupported()` returns false unless Android
- `src/core/services/FirebasePushNative.ts` also gates non-Android
- Android uses real `google-services.json`
- iOS `GoogleService-Info.plist` in repo is still a **placeholder** unless replaced
- `app.json` has `android.googleServicesFile` but **no** `ios.googleServicesFile` yet

Without this phase, iOS builds will not register for push like Android.

### 5.1 Create APNs key (Apple)

- [ ] Apple Developer → **Keys** → create key
- [ ] Enable **Apple Push Notifications service (APNs)**
- [ ] Download `.p8` once and store securely
- [ ] Note **Key ID** and **Team ID**

### 5.2 Firebase iOS app

- [ ] Open Firebase project used for Android push (`eduvijna-push`)
- [ ] Add iOS app with bundle ID `com.eduvijna.app`
- [ ] Download real **`GoogleService-Info.plist`**
- [ ] Replace placeholder file in the repo (or inject via EAS Secrets — preferred long-term)
- [ ] Firebase → Project settings → Cloud Messaging → upload APNs `.p8` + Key ID + Team ID

### 5.3 Wire Expo / app config

- [ ] Add under `ios` in `app.json`:
  - `"googleServicesFile": "./GoogleService-Info.plist"`
- [ ] Confirm `expo-notifications` plugin remains listed
- [ ] Confirm Push capability / entitlements as required by your chosen push path
- [ ] Rebuild with EAS (native config changes need a **new** build, not OTA alone)

### 5.4 Unlock iOS in app code

- [ ] Update `PushNotificationService.isPushSupported()` so iOS is allowed in production / dev builds (still exclude Expo Go if required)
- [ ] Update `FirebasePushNative.ts` Android-only gates if iOS uses the same path
- [ ] Ensure token type sent to backend matches what the API expects (Expo push token and/or FCM — align with Android)

### 5.5 Backend

- [ ] API accepts and stores iOS device tokens
- [ ] Send path works for iOS (Firebase/APNs or Expo push)
- [ ] No Android-only assumptions in notification send code

### 5.6 Re-test on TestFlight

- [ ] New iOS build installed
- [ ] Permission prompt appears; user grants notifications
- [ ] Token registered with backend
- [ ] Push received in background and foreground

---

## Phase 6 — Deep links like Android (Universal Links)

### Already present

- Custom scheme `eduvijna` in `app.json` (`eduvijna://`)
- Android intent filters for `https://app.eduvijna.com/openquiz`

### Still needed for iOS HTTPS parity

### 6.1 Host Apple association file (AASA)

- [ ] Serve `https://app.eduvijna.com/.well-known/apple-app-site-association`
- [ ] Must return HTTP 200, correct `application/json` (or `application/pkcs7-mime`) content type as required
- [ ] Include Team ID + bundle `com.eduvijna.app` + `/openquiz` paths
- [ ] See also repo doc: `DEEP_LINKING_PLATFORM_SETUP.md`

### 6.2 Expo config

- [ ] Add iOS `associatedDomains` for `applinks:app.eduvijna.com` in `app.json`
- [ ] Rebuild iOS with EAS

### 6.3 Store URL placeholders

- [ ] Replace `id123456789` with real App Store numeric ID after App Store Connect app exists

### 6.4 Test

- [ ] From Notes / Safari, open `https://app.eduvijna.com/openquiz?...`
- [ ] App opens (not only Safari)
- [ ] `eduvijna://` links still work

---

## Phase 7 — App Store public release

- [ ] Screenshots (iPhone required; iPad if `supportsTablet: true` stays on)
- [ ] Description, keywords, support URL, marketing URL
- [ ] Privacy policy URL
- [ ] App Privacy nutrition labels (camera, photos, notifications if enabled, account data, etc.)
- [ ] Age rating questionnaire
- [ ] Select a processed build for App Store
- [ ] Submit for Review
- [ ] Respond to any Apple rejection / questions
- [ ] Release when **Ready for Sale**
- [ ] Update website / deep-link fallbacks with live App Store URL

---

## Phase 8 — Ongoing dual-platform releases

Typical flow after first launch:

```text
1. Change code / config in repo
2. eas build -p ios --profile production
3. eas build -p android --profile production   (when Android also needs a store build)
4. eas submit -p ios --latest
5. TestFlight QA
6. Release in App Store Connect (and Play Console as usual)
```

Notes:

- `eas.json` already has `"appVersionSource": "remote"` and production `"autoIncrement": true`
- Pure JS changes may use OTA via `expo-updates`
- **Native changes require a new EAS build** (permissions, Firebase plist, associated domains, plugins, native modules)
- Push / deep-link / `app.json` native plugin changes = new build

Useful commands:

```bash
eas build -p ios --profile production
eas submit -p ios --latest
eas credentials -p ios
eas build:list
```

---

## Recommended execution order

| Order | Phase | Outcome |
|------:|-------|---------|
| 1 | Phase 1–2 | Apple + App Store Connect ready |
| 2 | Phase 3–4 | First TestFlight install; core app works |
| 3 | Phase 5 | Push parity with Android |
| 4 | Phase 6 | HTTPS open-quiz links on iPhone |
| 5 | Phase 7 | Public App Store |
| 6 | Phase 8 | Repeatable Android + iOS releases |

- **Fast path to a testable iPhone app:** Phases 1–4  
- **Full “same as Android”:** Phases 1–7 including push + Universal Links  

---

## Repo facts (as of this plan)

| Topic | Status |
|-------|--------|
| Expo CNG / prebuild (no committed `ios/` folder) | Expected — EAS generates native project |
| `ios.bundleIdentifier` | `com.eduvijna.app` |
| Camera / photo usage strings | Present in `app.json` |
| iOS deployment target | 15.1 (`expo-build-properties`) |
| `eas.json` submit.production | Empty `{}` — fill or use interactive submit |
| Push on iOS | Disabled in app code until Phase 5 |
| Universal Links in live `app.json` | Not wired yet — Phase 6 |
| App Store URL placeholders | `id123456789` — replace after Phase 2 / 7 |

Related docs in this repo:

- `DEEP_LINKING_PLATFORM_SETUP.md`
- `PUSH_NOTIFICATIONS_GUIDE.md`
- `FIREBASE_FCM_SETUP.md`
- `BUILD_NATIVE_APP.md`
- `Commands.txt`

---

## Common mistakes to avoid

1. Expecting **Expo Go** to prove production push / deep links — use EAS + TestFlight builds  
2. Changing Firebase plist / associated domains / permissions and forgetting to **rebuild**  
3. Bundle ID mismatch (must stay `com.eduvijna.app` everywhere)  
4. Leaving placeholder `GoogleService-Info.plist` and expecting push to work  
5. Skipping TestFlight and going straight to App Review  
6. Assuming push works on iOS after first build — code still gates Android-only until Phase 5  
7. Forgetting AASA must be publicly reachable over HTTPS for Universal Links  

---

## Non-code checklist (who must arrange what)

| Item | Why |
|------|-----|
| Active Apple Developer membership | Builds, TestFlight, App Store |
| Person who can complete Apple 2FA during `eas build` / `eas submit` | Credential creation |
| Access to Expo account / org | Same EAS project as Android |
| Firebase admin on `eduvijna-push` | Real iOS plist + APNs |
| Ability to publish AASA on `app.eduvijna.com` | Universal Links |
| Physical iPhone + TestFlight | Real-device QA (cannot fully validate iOS on Windows alone) |

---

## Progress tracker

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 0 Concepts | Done (documented) | | |
| 1 Accounts | Not started | | |
| 2 Apple App ID + ASC app | Not started | | |
| 3 Tools / EAS login | Not started | | |
| 4 First build + TestFlight | Not started | | |
| 5 Push iOS parity | Not started | | |
| 6 Universal Links | Not started | | |
| 7 App Store release | Not started | | |
| 8 Ongoing release process | Not started | | |

Update the table as you complete each phase.
