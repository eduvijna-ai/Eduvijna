# EduVijna — App Store Release Playbook (Next Time)

Use this file **every time** you ship a new iOS version (1.0.1, 1.1.0, etc.).

**Related docs:**
- `APPLE_IOS_SETUP_PLAN.md` — first-time Apple setup
- `APP_STORE_SUBMISSION_CHECKLIST.md` — full first-release checklist

**Last first submission:** Sep 2026 — EduVijna `1.0.0` submitted for App Review.

---

## 1. Accounts & apps you will use

| Tool / site | What for | Login |
|-------------|----------|--------|
| **Windows PC** (PowerShell) | EAS build + submit commands | — |
| **Expo / EAS** | Cloud iOS builds | Expo: `samathakotikanyadanam` |
| **Apple ID** | Signing + App Store Connect | `samatha@eduvijna.com` |
| **[App Store Connect](https://appstoreconnect.apple.com)** (browser) | Listing, TestFlight, Submit for Review, Release | Same Apple ID |
| **[expo.dev](https://expo.dev)** (browser) | Watch build status | Expo account |
| **TestFlight** (iPhone / iPad app) | Install beta builds & take screenshots | Device Apple ID = invited email |
| **App Store Connect** (optional phone app) | Check status on the go | Same Apple ID |

### Fixed IDs (do not change)

| Item | Value |
|------|--------|
| App name | EduVijna |
| Bundle ID | `com.eduvijna.app` |
| Organization | Eduvijna Technologies LLP |
| Apple Team ID | `847JWGJ2VM` |
| App Store Connect app ID | `6807368682` |
| EAS project | `@samathakotikanyadanam/eduvijna` |
| Repo folder | `d:\eduvijna\Eduvijna` |

---

## 2. Big picture (every update)

```text
1. Fix code in repo
2. Bump version in app.json (if needed)
3. eas build -p ios --profile production
4. eas submit -p ios --latest
5. TestFlight QA on real devices
6. Update App Store Connect listing (What's New, screenshots if UI changed)
7. Select new build → Add for Review → Submit
8. Wait for Apple (often < 48 hours)
9. Release when Approved
```

---

## 3. EAS commands (copy-paste)

Open **PowerShell** on Windows:

```powershell
cd d:\eduvijna\Eduvijna
```

### Check Expo login

```powershell
eas whoami
```

Must show: **`samathakotikanyadanam`**

If wrong / not logged in:

```powershell
eas logout
eas login
```

### Optional: update EAS CLI

```powershell
npm install -g eas-cli
```

### Build iOS production (required for every native / store release)

```powershell
eas build -p ios --profile production
```

**When prompted:**

| Prompt | Answer |
|--------|--------|
| Standard / exempt encryption? | **Y** (Yes) |
| Log in to Apple account? | **Y** |
| Apple ID | `samatha@eduvijna.com` |
| Password + 2FA | From iPhone |
| Team | **Eduvijna Technologies LLP** |
| New Distribution Certificate? | Usually **N** if already exist; **Y** if first time / missing |
| New Provisioning Profile? | Usually auto / **Y** if asked |
| Set up Push Notifications? | **N** until iOS push is ready |

**Wait:** often 20–60 minutes. Track at [expo.dev](https://expo.dev) → project **eduvijna** → Builds.

### Upload build to App Store Connect

After build status = **Finished**:

```powershell
eas submit -p ios --latest
```

**When prompted:**

| Prompt | Answer |
|--------|--------|
| Apple ID | `samatha@eduvijna.com` |
| Generate App Store Connect API Key? | **Y** (first time only) |
| API key role | **APP_MANAGER** (or ADMIN) |

Wait for App Store Connect → TestFlight → build **Processing** → **Ready to Test**.

### Android (same day, if needed)

```powershell
eas build -p android --profile production
```

(Submit to Play separately via Play Console / EAS submit for Android if configured.)

---

## 4. Version numbers (important)

In `app.json`:

```json
"version": "1.0.1"
```

| Field | Who sets it | Notes |
|-------|-------------|--------|
| **version** (e.g. 1.0.1) | You in `app.json` | User-facing App Store version |
| **buildNumber** (iOS) | EAS auto (`autoIncrement: true`) | Increments each production build |

**Rule:**
- Bug fix → `1.0.1`, `1.0.2`…
- New features → `1.1.0`, `1.2.0`…
- Never reuse a version string Apple already released without a new build number (EAS handles build number)

Also update `"runtimeVersion"` if you use OTA and need a new native runtime (ask team if unsure). For store rebuilds with native changes, keep runtime aligned with app version policy.

---

## 5. TestFlight QA (before App Review)

### Where to go

1. Browser: [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Apps → EduVijna → TestFlight**
3. Wait until build shows ready (not Processing)

### Internal testers (team)

1. **Users and Access → People** → invite email if new person  
2. They **Accept** the invite  
3. **TestFlight → Internal Testing → Team (Expo) → Testers → +**  
4. On their device: Apple ID = invited email → install **TestFlight** → Install EduVijna  

**“No Builds Available”** → invite not accepted, wrong Apple ID, or wait 15–30 min / re-add tester.

### TestFlight tip

- TestFlight uses the **device Apple ID** (Settings → [Name]) — no separate TestFlight login  
- **Redeem Code** = wrong flow / wrong Apple ID — use invite email → **View in TestFlight**

### QA checklist

- [ ] App opens
- [ ] Login works
- [ ] Quizzes / assessments
- [ ] Camera / gallery upload
- [ ] ERP screens you care about
- [ ] No crash on cold start

---

## 6. App Store Connect — prepare the new version

### Open listing

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Apps → EduVijna → Distribution**
3. Left: **iOS App → + Version** (or open existing Prepare for Submission)
4. Enter new version (e.g. `1.0.1`) matching `app.json`

### Fill / update

| Field | What to do |
|-------|------------|
| **What's New** | Required — what changed in this release |
| **Description / Keywords** | Update only if needed |
| **Screenshots** | Update if UI changed |
| **Support URL** | Must still work |
| **Privacy Policy URL** | Must still work (`https://app.eduvijna.com/privacy`) |
| **Build** | **+** → select the **new** TestFlight build |
| **App Review Information** | Keep demo login working |
| **Version Release** | Prefer **Manually release** |

### Demo account (required if login needed)

- [ ] Demo username + password still work on production API
- [ ] Notes explain how to test new features

### App Privacy

- Only change if you collect **new** data types
- After edits → **Publish** again
- Submit is blocked if privacy is incomplete

### Price

- EduVijna = **Free** (no Apple IAP today)
- **Paid Apps Agreement** not required for free-only updates

---

## 7. Screenshots (if you update them)

### iPhone (6.5" slot)

Accepted sizes include:

```text
1284 × 2778   or   1242 × 2688
```

Folder used before:

```text
d:\eduvijna\Eduvijna\assets\app-store-screenshots-iphone\
```

### iPad (13" slot) — required while `supportsTablet: true`

Accepted sizes include:

```text
2048 × 2732   or   2064 × 2752
```

Folder used before:

```text
d:\eduvijna\Eduvijna\assets\app-store-screenshots-ipad\
```

### Rules

- Take screenshots on device via **TestFlight**
- Transfer with **Email / Drive / USB** — **not WhatsApp** (compresses → wrong size)
- If wrong size, resize to exact pixels above, then upload
- **iPhone shots ≠ iPad shots** — need both if tablet supported

### Optional escape hatch (no iPad)

In `app.json`:

```json
"supportsTablet": false
```

Then new EAS build + submit — iPad screenshots no longer required.

---

## 8. Submit for App Review

1. **Distribution → iOS App → [version]**
2. Confirm no yellow warnings
3. **Add for Review** → **Submit**
4. Export compliance: encryption **Yes**, exempt / standard **Yes** (HTTPS)
5. Status: **Waiting for Review** → **In Review**

Email when done (up to ~48 hours; sometimes longer).

---

## 9. After Apple decides

### Approved

1. **Distribution → version → Release This Version** (if manual)
2. Wait for **Ready for Sale** / live on App Store
3. Update website download link
4. Replace store URL placeholders in code if needed:
   - `src/core/services/deepLinkService.ts`
   - `src/core/components/WebDeepLinkHandler.tsx`
5. Live URL pattern: `https://apps.apple.com/app/id6807368682`

### Rejected

1. Open **App Review** / **Resolution Center**
2. Read reason
3. Fix code or metadata
4. If code fix → new `eas build` + `eas submit`
5. Reply / **Resubmit for Review**

---

## 10. One-page checklist (next release)

### Code / EAS

- [ ] Code fixes merged
- [ ] `app.json` version bumped
- [ ] `eas whoami` = correct Expo account
- [ ] `eas build -p ios --profile production` succeeded
- [ ] `eas submit -p ios --latest` succeeded
- [ ] Build Ready on TestFlight

### QA

- [ ] TestFlight install on 1–2 devices
- [ ] Core flows OK
- [ ] Demo account for Apple still works

### App Store Connect

- [ ] New version created (matches `app.json`)
- [ ] What's New written
- [ ] New build selected
- [ ] Screenshots updated if UI changed
- [ ] App Privacy published (if changed)
- [ ] Support + Privacy URLs live
- [ ] Add for Review → Submit

### After approval

- [ ] Release version
- [ ] Update website / store links

---

## 11. Common problems (quick fix)

| Problem | Fix |
|---------|-----|
| `eas: command not found` | `npm install -g eas-cli` |
| Wrong Expo account | `eas logout` → `eas login` |
| Build fails | Open build log on expo.dev |
| TestFlight “No Builds Available” | Accept Users & Access invite; same Apple ID; wait / re-add |
| Redeem Code in TestFlight | Wrong Apple ID / wrong flow — use invite email |
| Screenshot size error | Resize to exact Apple sizes; don’t use WhatsApp |
| Unable to Add for Review — App Privacy | Complete Set Up on all data types → **Publish** |
| Paid Apps / address errors | Free app → skip; Free Apps Agreement Active is enough |

---

## 12. Exact command block (print & keep)

```powershell
cd d:\eduvijna\Eduvijna
eas whoami
eas build -p ios --profile production
# wait until Finished on expo.dev
eas submit -p ios --latest
# then: TestFlight QA → App Store Connect → Add for Review
```

Apple login during build/submit: **`samatha@eduvijna.com`**  
Team: **Eduvijna Technologies LLP**

---

## 13. Progress log (fill each release)

| Version | Build | Date submitted | Result | Notes |
|---------|-------|----------------|--------|-------|
| 1.0.0 | 1 | Sep 2026 | Submitted | First iOS App Store review |
| | | | | |

---

**Remember:** For a normal update you usually only need **EAS build → EAS submit → TestFlight test → select build → Submit for Review**. You do **not** redo Apple Developer enrollment or create a new App ID.
