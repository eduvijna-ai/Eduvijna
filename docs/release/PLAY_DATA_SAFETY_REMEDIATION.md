# Google Play Data Safety Remediation — EduVijna Android

Date: 2026-10-21 · Mobile repo: `eduvijna-ai/Eduvijna` (public) · Branch: `main` direct
Read-only refs: `eduvijna-ai/eduvijna-api` @ `2de33f0`, `eduvijna-ai/Quiz-React` @ `8f65e7f` (incl. PR #335 privacy-email fix)
**Nothing was submitted in Play Console. No AAB was published.**

## 1. Release baseline & version-40 identity

| Item | Value | Evidence |
|---|---|---|
| Current mobile `main` (pre-fix) | `906cd9f` (Merge PR #26) | `git log origin/main` 2026-10-21 |
| App | `com.eduvijna.app`, Expo slug `eduvijna`, version `1.0.0`, runtimeVersion `1.0.0` | `app.json` |
| Version code | **Not in source.** `eas.json` production uses `autoIncrement: true` + `appVersionSource: "remote"` (EAS remote versioning) | `eas.json` |
| Version-code-40 AAB | **Cannot be identified from this repo** — no AAB, mapping file, or versionCode 40 record is committed. It exists (if at all) only in Play Console / EAS build history. Do not equate `main@906cd9f` with the v40 artifact: v40 may predate merges #26 and the crop/push fixes in `26259bb`. | repo search: no `versionCode` anywhere |
| Release API config | `https://eduapi.eduvijna.com` (`app.json extra.API_BASE_URL`; `app.config.ts` injects per-env origin; `production-release` profile in `scripts/with-eduvijna-api-env.mjs`) | verified live: `GET /health` → 200, env `production`, 2026-10-21 |
| Signing/build | EAS Build `production` profile (auto-increment). No local keystore in repo. | `eas.json` |

**Conclusion:** the Play rejection was against the v40 artifact; current `main` is *newer source*, not proven identical to v40. Any runtime fix (§3) therefore requires a **new AAB with versionCode > highest uploaded** (check Console; at least 41) built via EAS production. This remediation changes runtime code, so a rebuild **is** required — it is not declaration-only.

## 2. Confirmed email collection (the reported issue)

Email **is collected** and must be declared. It is not optional in practice:

- Login: `POST /api/v1/auth/login` with `username_or_email` + password (`src/core/api/auth.api.ts:29-48`).
- Register/profile: `GET|PUT /api/v1/auth/profile` returns/accepts `email` (`profile.api.ts`); Profile screen edits email.
- Recovery: API `POST /api/v1/auth/forgot-password`, `/reset-password` (`eduvijna-api app/api/auth_postgrest.py:697,742`; mobile `requestPasswordReset` exists but posts to legacy `/auth/forgot-password` — see API spec §2, founder to confirm reachability; do not declare a mobile recovery flow until verified in the shipped build).
- Privacy Policy §2.1 was already corrected on web (PR #335, Quiz-React `947e07f`) to "Email address (Optional)" — **that web text does not change the Play answer**: Play asks what the *app* collects. In the app, an account (hence email/username credential) is required for all core features; declare Email address as collected, **Required** (account creation/management), not Optional, unless the founder confirms a no-email account path in the shipped build. **UNRESOLVED — founder to confirm.**

## 3. Data inventory (evidence-based)

| Data | Collected? | Evidence (mobile → API) | Purpose | Recipient / sharing | Retention / deletion (verified) |
|---|---|---|---|---|---|
| Email, name, username, password (hashed server-side per policy §5.2 — *not verified in API code this pass*) | Yes | `auth.api.ts`, `profile.api.ts`, Profile.tsx form (name/username/email/phone/address/school/bio/avatar_url) | Account management, authentication | EduVijna API only (`eduapi.eduvijna.com`); no ad/analytics SDK in `package.json` | Account active duration (policy §5.3). Deletion: email request only today (§4). Backup purge 90d / archive 180d **claimed in policy, NOT verified in code** |
| Phone, address, school, bio (optional profile fields) | Yes, user-provided | `UpdateProfileRequest` | App functionality (profile) | API only | Same as above |
| Photos / document images & files (camera, photo library, document picker) | Yes, user-initiated | `expo-image-picker` (camera/photos perms in `app.json`), `expo-document-picker`, `documentUploadApi.ts`, crop/rotation preserved | OCR / quiz generation (core feature) | API → OCR/AI processors named in policy §4.1 (Mathpix, OpenAI, Google Gemini, Groq, AnythingLLM) — **processor list from policy text; API env confirms Gemini + AnythingLLM configured (`/health`), Mathpix/OpenAI not verified this pass** | Not verified in code; policy claims temp processing + stored only with consent — **UNRESOLVED** |
| Assessment data: questions, answers, scores, time, attempts | Yes | `assignedQuizSubmission.service.ts`, QuizTaking flows, API quiz-session endpoints | App functionality, education records | API; visible to assigned teachers/school admins (policy §4.2) | Not verified; school records may be institution-retained — **UNRESOLVED (founder/legal)** |
| Push token (FCM/Expo), device model/OS/app version | Yes | `PushNotificationService.ts` → `POST /api/notifications/devices` (API `push_notification_controller.py:101`); `expo-device` metadata | Notifications | API; FCM transport (Google) | Token deleted via `DELETE /devices/{token_id}` on disable/logout paths; server retention after account deletion **UNRESOLVED** |
| User IDs / school, class, role identifiers | Yes | JWT profile, ERP APIs (`erp.api.ts`) | Account, school functionality | API; within-school visibility | Tied to account/school records |
| Location, contacts, SMS, financial/payment in-app | **No evidence in mobile code** | No such permissions/APIs in `app.json`/`package.json`. Policy §2.1 payment text describes web/institutional billing — **do not declare payment data for the Android app unless the shipped build takes payment** | — | — | — |
| WebView content | Limited | Deep links `app.eduvijna.com/openquiz`, `eduvijna://` (`app.json` intentFilters); no embedded third-party WebView data collection found this pass | Deep-link opening | — | — |
| SDKs | Expo notifications/device/image/document, Firebase (FCM via `google-services.json`, native `FirebasePushNative`) | `package.json`, `app.json` | Push, media | Google FCM processes push tokens/messages per Google terms | Per Google |

Permissions ≠ collection: camera/photos are only accessed on user-initiated capture/pick (`app.json` usage strings) — declare **Photos and videos** as collected because picked/captured media is uploaded to the API for generation.

**Logging fix (this change):** removed values of push tokens, device-token request bodies, and username/email from logs in `PushNotificationService.ts`, `FirebasePushNative.ts`, `dataLoader.ts`, `Profile.tsx`. This was unnecessary personal-data logging; auth/assessment behaviour unchanged.

## 4. Privacy Policy & deletion (what shipped in mobile)

- Published Privacy Policy (verified live 2026-10-21, HTTP 200): **`https://app.eduvijna.com/privacy`** (Quiz-React route `/privacy` → `PrivacyPolicy.tsx`). ⚠️ `https://eduvijna.com/privacy` returns **404** — policy text/Terms still cite `eduvijna.com/privacy`; founder fix in Quiz-React spec.
- Mobile now links that URL from: mobile `Profile.tsx` (Privacy & Account card, all roles using that screen), ERP teacher/admin/student `SettingsScreen.tsx`. Failures show an error alert — no dead taps.
- Deletion: **no self-service deletion API exists** (API spec §3). Mobile Delete Account no longer says "not yet available"/fake-deletes: it explains the verified email process (Privacy Policy §6.3: `contactus@eduvijna.com`, "Account Deletion Request") and opens a pre-filled mail client. It never claims "deleted" or "request submitted". The previously unreachable delete modal is now reachable from the Profile card.
- **Dependency:** a real in-app/web deletion-request flow awaits the founder's Quiz-React + API work (specs delivered). Until then the email route is the truthful process — Play's account-deletion requirement accepts a linked deletion-request path, but the *web* deletion URL field in Play Console needs the founder's public page (Quiz-React spec §3).

## 5. Proposed Play Console Data safety answers (founder to confirm unresolved items)

Answer for the **Android app**, based on §3. Do not copy the web policy's "Optional" label blindly.

- **Email address** — Collected, **Required**, not ephemeral, purpose: Account management (+ App functionality). Shared: not sold; processed by service providers only. *This directly addresses the reported email discrepancy: if v40's form said "not collected", correct it to collected.*
- **Name, User IDs** — Collected, Required, Account management/App functionality.
- **Phone number, Address** — Collected, **Optional** (profile fields), App functionality/Account management. *(Confirm no other use.)*
- **Photos and videos / Files and docs** — Collected, Optional (user-initiated generation feature), App functionality. Processed ephemerally? **Do not answer Yes until API retention is verified** (§3 unresolved).
- **App activity / assessment interactions & scores** — Collected, Required for enrolled use, App functionality (+ Analytics only if actually used for analytics — no analytics SDK found; answer purposes conservatively as App functionality).
- **Device or other IDs (push token)** — Collected, Optional (notifications can be off), App functionality (notifications).
- **Encryption in transit:** Yes — all API traffic is HTTPS (`https://eduapi.eduvijna.com`, TLS). **Encryption at rest / provider guarantees: UNRESOLVED — do not claim beyond what the founder verifies with the host/DB provider.**
- **Data deletion:** Users can request deletion — Yes, via email today; add the web deletion URL once the founder publishes it. "Can users request data be deleted?" must match the live mechanism at resubmission time.
- **Data shared with third parties:** declare processors actually used by shipped features (FCM/Google; OCR/AI processors *only if* the founder confirms they receive user content in production). **UNRESOLVED items must be resolved before submitting — do not guess.**

Unresolved business facts (block final answers): (1) email-required vs optional in shipped onboarding; (2) uploaded-file & assessment retention periods; (3) backup purge practice vs policy's 90/180-day claims; (4) full production AI/OCR processor list; (5) children's-data posture (schools product — founder/legal to confirm target audience answers); (6) whether any payment occurs in-app.

## 6. Exact manual resubmission steps (founder, in Play Console)

1. Publish founder's Quiz-React changes (privacy URL fixes + deletion-request page) and verify `https://app.eduvijna.com/privacy` and the new deletion URL load publicly (logged-out, mobile browser).
2. Build new AAB from mobile `main` (this fix) via EAS `production`; confirm versionCode > highest in Console (≥41 if 40 was max) and production API origin in the build log/`config:verify`.
3. Upload AAB to the release track; complete **App content → Data safety** with §5 answers; set **Privacy Policy URL** to `https://app.eduvijna.com/privacy`; in **Account deletion** (App content) provide the published deletion-request URL (or the email process if the form allows) — the URL must resolve publicly.
4. Also update the store listing privacy link if it points at `eduvijna.com/privacy` (404).
5. Answer any Families/target-audience questions per founder/legal confirmation (§5 item 5) — not covered by this code change.
6. Submit for review. Do not claim approval until Google communicates it.

## 7. Verification (this change)

- `npx jest src/__tests__/legalLinks.test.ts` — URL/mailto contract (no fake-submission wording).
- `npx tsc --noEmit` filtered to touched files — see handoff.
- Live checks 2026-10-21: `app.eduvijna.com/privacy` 200; `eduvijna.com/privacy` 404; `eduapi.eduvijna.com/health` 200 production.
- Not done: no real account deleted, no Play submission, no production deploy, no AAB build (EAS build is a founder release action — §6 step 2).
