# EduVijna — App Store Submission Checklist

Step-by-step checklist to release EduVijna on the **public App Store** (not TestFlight only).

**Related docs:** `APPLE_IOS_SETUP_PLAN.md`

---

## App identity

| Item | Value |
|------|--------|
| App name | EduVijna |
| Bundle ID | `com.eduvijna.app` |
| Organization | Eduvijna Technologies LLP |
| Apple Team ID | `847JWGJ2VM` |
| App Store Connect Apple ID | `6807368682` (numeric app ID in ASC URL) |
| Current version | `1.0.0` |
| EAS owner | `samathakotikanyadanam` |
| Apple account | `samatha@eduvijna.com` |

---

## Big picture — what you are doing

```text
TestFlight testing (done)
        ↓
Prepare listing + legal + privacy in App Store Connect
        ↓
Build final iOS release (EAS) if needed
        ↓
Select build + Submit for App Review
        ↓
Apple reviews (1–3 days typical)
        ↓
Release → app live on App Store
```

**TestFlight** = beta testing (you already have this).  
**App Store submit** = Apple reviews your listing + app, then anyone can download from the App Store.

---

## Progress summary

| Area | Status |
|------|--------|
| Apple Developer enrollment + payment | Done |
| App ID `com.eduvijna.app` | Done |
| App Store Connect app created | Done |
| First iOS build + TestFlight internal | Done |
| App Store listing complete | Not started |
| App Privacy + Age Rating | Not started |
| Agreements / Tax / Banking | Verify |
| Submit for Review | Not started |
| Public release | Not started |

---

## Phase 1 — Pre-submit testing (do first)

Goal: Fix critical bugs before Apple sees the app.

- [ ] Test on at least 2 real iPhones via TestFlight
- [ ] Login / logout works
- [ ] Main dashboards and quiz flows work
- [ ] Camera + photo picker (document / handwritten quiz) works
- [ ] ERP / school modules you ship work
- [ ] No crash on cold start
- [ ] Document any known issues (push on iOS not working yet is OK if not advertised)

**Note:** iOS push is Android-only in code today — OK for v1 if you do not claim push in the listing.

---

## Phase 2 — Apple agreements (compulsory)

Without this, you **cannot** release on the App Store.

1. Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Go to **Business** (or **Agreements, Tax, and Banking**)
3. Complete:

- [ ] **Apple Developer Program License Agreement** — active
- [ ] **Paid Applications Agreement** — **Accept** (required even for free apps)
- [ ] **Banking** — add if you will sell paid features / subscriptions later (optional for free app)
- [ ] **Tax forms** — complete if prompted (W-8BEN for India org, etc.)

---

## Phase 3 — Website / legal URLs (compulsory)

Apple requires **live public URLs**. Placeholder or broken links cause rejection.

- [ ] **Privacy Policy URL** — public page describing data collection  
  Example host: `https://eduvijna.com/privacy` or your legal page
- [ ] **Support URL** — public help/contact page  
  Example: `https://eduvijna.com/support` or contact page with email
- [ ] **Marketing URL** (optional) — e.g. `https://eduvijna.com`

Privacy policy must match **App Privacy** answers in Phase 5.

---

## Phase 4 — Demo account for Apple reviewers (compulsory if login required)

EduVijna requires login → Apple **must** be able to test.

- [ ] Create a dedicated **demo / review account** on your backend
- [ ] Username + password that work in production API
- [ ] Account has access to main features (quiz, dashboard — not empty)
- [ ] Account does not expire during review
- [ ] Write **Review Notes** explaining how to log in and what to test

Example review notes:

```text
Login with the demo credentials below.
After login, open Assessments to create/view quizzes.
Use Create Document Quiz to test camera/photo upload.
```

---

## Phase 5 — App Store Connect listing (compulsory)

**Path:** My Apps → **EduVijna** → **Distribution** tab (or App Store → iOS App)

### 5.1 Version information

- [ ] Version: `1.0.0` (match `app.json`)
- [ ] **What's New** text (release notes for first release — describe EduVijna features)
- [ ] Copyright: e.g. `2026 Eduvijna Technologies LLP`

### 5.2 App information

- [ ] **Name:** EduVijna (max 30 characters)
- [ ] **Subtitle** (optional, max 30 chars): e.g. `Smart Learning Platform`
- [ ] **Description** (compulsory): clear explanation for schools/students/teachers
- [ ] **Keywords** (compulsory): comma-separated search terms
- [ ] **Primary category:** Education
- [ ] **Secondary category** (optional): e.g. Productivity
- [ ] **Support URL** (compulsory)
- [ ] **Privacy Policy URL** (compulsory)
- [ ] **Marketing URL** (optional)

### 5.3 Screenshots (compulsory)

Capture from **TestFlight** on real devices. No mockups that misrepresent the app.

Because `supportsTablet: true` in `app.json`:

| Device size | Required? | Count |
|-------------|-----------|-------|
| iPhone 6.7" display | Yes (primary) | 1–10 screenshots |
| iPhone 6.5" display | Often required if 6.7" not provided | 1–10 |
| iPad Pro 12.9" | Yes (tablet supported) | 1–10 |
| iPad Pro 11" | May be required | 1–10 |

- [ ] iPhone screenshots uploaded
- [ ] iPad screenshots uploaded (or disable tablet — see Phase 8 optional)

**Tip:** App Store Connect shows exact pixel sizes when you click the slot.

### 5.4 App icon for store (if prompted separately)

- [ ] 1024×1024 PNG, no transparency, no rounded corners in file  
  Source: `assets/icon.png` (verify dimensions before upload)

---

## Phase 6 — App Privacy (compulsory)

**Path:** App Store Connect → EduVijna → **App Privacy**

Answer honestly based on what EduVijna actually collects.

Likely declarations for EduVijna:

- [ ] **Contact Info** — email, name (account login)
- [ ] **User Content** — photos, documents, quiz answers
- [ ] **Identifiers** — user ID / account ID
- [ ] **Photos** — camera / gallery for document quizzes
- [ ] **Usage Data / Diagnostics** — only if you collect analytics/crash data

For each type, specify:

- Linked to user? (usually Yes for account data)
- Used for tracking? (usually No unless you use ad tracking)
- Purpose: App Functionality, Analytics, etc.

- [ ] Privacy policy URL matches these answers
- [ ] Click **Publish** on App Privacy when complete

---

## Phase 7 — Age rating (compulsory)

**Path:** App Store Connect → EduVijna → **Age Rating** (or in version page)

Complete the questionnaire honestly:

- [ ] User-generated content? (quizzes, uploads — likely Yes, describe moderation)
- [ ] Unrestricted web access? (if WebView opens external sites)
- [ ] Made for kids? (answer based on your target audience)
- [ ] Education context

- [ ] Save final age rating (e.g. 4+, 9+, 12+)

---

## Phase 8 — Build selection (compulsory)

### Option A — Use existing TestFlight build

If build **1.0.0 (1)** is still valid (not expired, tested, no critical bugs):

- [ ] Distribution → iOS App version **1.0.0**
- [ ] **Build** section → **+** → select build **1.0.0 (1)**

### Option B — New build (recommended if you fixed bugs)

From Windows:

```bash
cd d:\eduvijna\Eduvijna
eas build -p ios --profile production
eas submit -p ios --latest
```

- [ ] Wait for processing in App Store Connect
- [ ] Select the new build on the version page

**Build expiry:** TestFlight/App Store builds expire after **90 days** from upload.

---

## Phase 9 — Export compliance (compulsory)

Already set in `app.json`:

```json
"ITSAppUsesNonExemptEncryption": false
```

When submitting:

- [ ] Confirm app uses **standard encryption only** (HTTPS)
- [ ] No additional export documentation needed for typical EduVijna setup

If App Store Connect asks on the build:

- Uses encryption? → **Yes**
- Exempt / standard only? → **Yes**

---

## Phase 10 — App Review information (compulsory)

**Path:** Version page → **App Review Information**

- [ ] **First name, Last name**
- [ ] **Phone number** (reachable during review)
- [ ] **Email:** `samatha@eduvijna.com`
- [ ] **Sign-in required?** → **Yes**
- [ ] **Demo username**
- [ ] **Demo password**
- [ ] **Notes:** step-by-step for reviewer (login → quiz → camera)

Optional:

- [ ] Attachment (screenshot of login screen) if UI is non-obvious

---

## Phase 11 — Submit for review

Pre-flight — all must be green:

- [ ] Paid Applications Agreement accepted
- [ ] Privacy Policy URL live
- [ ] Support URL live
- [ ] Screenshots uploaded (iPhone + iPad)
- [ ] Description + keywords filled
- [ ] App Privacy published
- [ ] Age rating complete
- [ ] Build selected on version **1.0.0**
- [ ] Demo account tested by you on TestFlight
- [ ] Export compliance answered

Submit:

1. App Store Connect → **EduVijna** → **Distribution**
2. Open iOS App version **1.0.0**
3. Click **Add for Review** (or **Submit for Review**)
4. Answer any final questions (ads, IDFA, content rights)
5. Confirm **Submit**

- [ ] Status changes to **Waiting for Review**
- [ ] Then **In Review** (typically 24–48 hours, sometimes longer)

---

## Phase 12 — After approval — release

When status is **Approved** or **Ready for Sale**:

- [ ] Choose **Release manually** or **Automatic release**
- [ ] App appears on App Store (can take a few hours to propagate)
- [ ] Copy live App Store URL from App Store Connect
- [ ] Replace placeholder `id123456789` in code:
  - `src/core/services/deepLinkService.ts`
  - `src/core/components/WebDeepLinkHandler.tsx`
- [ ] Update website with App Store badge / download link
- [ ] Announce to users / schools

Live URL format:

```text
https://apps.apple.com/app/id6807368682
```

(Verify exact URL in App Store Connect after release.)

---

## Phase 13 — If Apple rejects

Common EduVijna-related reasons:

| Rejection reason | Fix |
|------------------|-----|
| Cannot log in | Fix demo account; update review notes |
| Privacy mismatch | Align App Privacy + privacy policy |
| Missing purpose strings | Already have camera/photos in `app.json` |
| Crashes on launch | Fix bug → new EAS build → resubmit |
| Incomplete metadata | Add screenshots / description |
| Guideline 4.2 (minimum functionality) | Ensure reviewer can complete core flows |

Steps:

1. Read **Resolution Center** message in App Store Connect
2. Fix the issue
3. If code changed: `eas build -p ios` → `eas submit` → select new build
4. Reply in Resolution Center → **Resubmit for Review**

---

## Phase 14 — Optional before or after v1

Not required for first App Store release:

- [ ] iOS push notifications (APNs + Firebase iOS)
- [ ] Universal Links for `https://app.eduvijna.com/openquiz`
- [ ] Set `supportsTablet: false` + rebuild if you want to skip iPad screenshots
- [ ] Localization (Hindi, etc.)
- [ ] App preview video

---

## Commands reference (Windows)

```bash
cd d:\eduvijna\Eduvijna

# Check Expo account
eas whoami

# New production iOS build
eas build -p ios --profile production

# Upload to App Store Connect
eas submit -p ios --latest
```

---

## Compulsory vs optional — one page summary

### Must have

1. Active Apple Developer membership  
2. Paid Applications Agreement  
3. Privacy Policy URL (public)  
4. Support URL (public)  
5. App description, keywords, category  
6. Screenshots (iPhone; iPad if tablet supported)  
7. App Privacy questionnaire (published)  
8. Age rating  
9. Production build selected  
10. Demo login for reviewers  
11. Export compliance  
12. App tested on real iPhone  

### Can wait until later

- iOS push parity with Android  
- Universal Links  
- External TestFlight beta  
- Paid features / banking (if app is free)  
- Marketing video  

---

## Suggested timeline

| Day | Task |
|-----|------|
| 1 | Finish TestFlight QA; fix critical bugs |
| 2 | Publish privacy policy + support pages |
| 3 | Screenshots + listing text + demo account |
| 4 | App Privacy + Age Rating + Agreements |
| 5 | Select build → Submit for Review |
| 6–8 | Apple review |
| 9 | Release + update App Store links |

---

## Progress tracker

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 1 Pre-submit testing | In progress | | TestFlight working |
| 2 Agreements | Not started | | |
| 3 Legal URLs | Not started | | |
| 4 Demo account | Not started | | |
| 5 Listing + screenshots | Not started | | |
| 6 App Privacy | Not started | | |
| 7 Age rating | Not started | | |
| 8 Build selection | Not started | | Build 1.0.0 (1) available |
| 9 Export compliance | Done in app.json | | |
| 10 Review information | Not started | | |
| 11 Submit for review | Not started | | |
| 12 Release | Not started | | |
| 13 Post-release URL update | Not started | | Replace id123456789 |

Update this table as you complete each phase.
