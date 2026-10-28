# Founder emulator session — preparation evidence (2026-10-28)

## Environment

| Item | Value |
|------|--------|
| Branch | `fix/mobile-crossplatform-p0-stabilization` |
| Code HEAD (bundle stamp) | `1f8e61cec6dcc132cbed10e634a41aee7742c1e9` |
| Session evidence tip | `517c8dcf7e777b7623d6b46ab9f0c237d468d0b6` |
| Working tree | Clean PR tip + local engineering stamp + this evidence (not merged) |
| AVD | `Eduvijna_Android_Dev` |
| ADB | `emulator-5554    device` |
| Package | `com.eduvijna.app` |
| APK | `android/app/build/outputs/apk/debug/app-debug.apk` (reinstalled; label EduVijna; `x86_64`+`arm64-v8a`) |
| Metro | `http://localhost:8082` — **running** (dev-client, LAN); `adb reverse tcp:8082` set |
| API | `https://dev-api.eduvijna.com` (`EDUVIJNA_API_ENV=development`) |
| Build stamp | `ENGINEERING_IMPLEMENTATION_SHA = 1f8e61c…` |
| App focus | `com.eduvijna.app/.MainActivity` |
| Visible UI | Authenticated session; Document tile opened **Document Upload** home (Camera / Gallery / From Books / Library) |

## Automated results

| Check | Result |
|-------|--------|
| `npm run config:verify` | **PASS** |
| Focused Jest (13 suites / 64 tests) | **PASS** — see `founder-prep-focused-jest.txt` |
| Metro Android bundle | **PASS** — `Android Bundled … index.js (2329 modules)` |
| Emulator boot / ADB device | **PASS** |
| APK install + launch | **PASS** |
| No redbox / crash at launch | **PASS** (Dashboard loaded) |

## Seven-issue execution status

| # | Scenario | Engineering status | Founder action |
|---|----------|--------------------|----------------|
| 1 | Dashboard Document and '+' Document same screen | Unit **PASS**. Emulator: Document tile → Document Upload home (**executed**). '+' parity still for Founder. | **READY FOR MANUAL TEST** ('+' path) |
| 2 | Camera capture / preview not stuck loading | Code + unit coverage; needs live camera permission on emulator. | **READY FOR MANUAL TEST** |
| 3 | From Books generation API handling | Unit **PASS** (`savedBooksGenerationJobs`, extract). Live generate needs Founder navigation. | **READY FOR MANUAL TEST** |
| 4 | Submitted answers retain selected option | Unit/integration **PASS** (Swachh / identity). Live submit not run (non-prod smoke only). | **READY FOR MANUAL TEST** |
| 5 | Results / grading / explanations agree | Unit **PASS** (quarantine + identity). | **READY FOR MANUAL TEST** |
| 6 | Deep-link Cancel / Back | Unit **PASS** (`openQuizRequestGuard`, `QuizLoadingScreen.cancel`). Live deep-link on emulator optional. | **READY FOR MANUAL TEST** |
| 7 | Home/Dashboard after opening assessment | Unit/nav coverage; needs Founder path. | **READY FOR MANUAL TEST** |

## Founder checklist (no shell commands)

1. Confirm the emulator window shows EduVijna Dashboard (already signed in as Samatha / Demo School).
2. **Document parity:** Open Document from the generation tiles, then open Document again from `+` / Create Assessment — both should land on the same Document Upload home.
3. **Camera:** Capture a page → preview must appear without endless spinner; Cancel/back must clear loading.
4. **From Books:** Generate a small assessment from an existing book; confirm questions appear and can be saved/reopened.
5. **Submit answers:** Take a short quiz; note selected options; submit.
6. **Results / explanations:** Reopen results; selected options and correct marking must match; conflicting explanations must show verified answer only / unavailable — not wrong reasoning.
7. **Deep link / Dashboard:** Open an assessment link if available; Cancel/Back must leave “Validating…”; Home/Dashboard must work afterward.

Report each as PASS/FAIL with screenshots.

## Crop runtime P0 (2026-10-28 follow-up)

| Item | Result |
|------|--------|
| Exception | `JSApplicationIllegalArgumentException` / `disconnectAnimatedNodeFromView` (Fabric NativeAnimated) |
| Fix | Safe modal dismiss + no ActivityIndicator + `animationType="none"` + single-flight session |
| Emulator | **10/10** Crop → Crop & use; **0** disconnect crashes |
| Evidence | `docs/development/evidence/20261028-crop-runtime/` |
| Jest (crop lifecycle) | **2 suites passed / 2 total**; **4 tests passed / 4 total** |
| Jest (focused P0+crop) | **11 suites passed / 11 total**; **49 tests passed / 49 total** |

## Flags

`READY_FOR_FOUNDER_EMULATOR_TESTING=true`

`READY_FOR_CROSSPLATFORM_RELEASE=false` (AASA 404 / assetlinks 500 / physical device still separate)

Physical phone LAN: **ON HOLD**  
iOS physical: **PENDING**
