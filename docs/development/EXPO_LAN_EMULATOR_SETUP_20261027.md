# EduVijna — Expo LAN + Android Emulator Setup (2026-10-27)

Environment-configuration only. No application bug fixes. No assessment / navigation / document-generation / quiz-result / deep-link business logic changes.

## Handoff

| Field | Value |
|-------|-------|
| **DEVELOPMENT_ENVIRONMENT_READY** | **`true`** |
| Scope of READY | Emulator + Metro 8082 + **local development-client APK** install + LAN Metro connection + initial Sign-in screen + reload verified. |
| Physical Android LAN | **PENDING** (separate; not required for READY) |
| Branch | `chore/expo-lan-emulator-setup-20261027` |
| Baseline SHA | `0e81f9e3dfb8b88f4dab6c7b7158819c602b9a2c` |
| Setup commit | *(filled after commit)* |
| Captured LAN IP (this host session) | `10.147.219.97` (Wi-Fi) — re-detect every session |
| Metro port | `8082` |

Re-detect IP: `npm run dev:lan:ip` (helpers do **not** hardcode the IP).

---

## 1. Git state

| Check | Result | Evidence |
|-------|--------|----------|
| Baseline SHA | **PASS** | `0e81f9e3dfb8b88f4dab6c7b7158819c602b9a2c` |
| Branch | **PASS** | `chore/expo-lan-emulator-setup-20261027` |
| Application business logic | **PASS** | Unchanged |
| Generated `android/` | **gitignored** | CNG output; not committed |
| APKs | **gitignored** | `*.apk` / `*.aab` |

---

## 2. Toolchain (unchanged from Phase 1)

| Component | Detail | Status |
|-----------|--------|--------|
| ANDROID_HOME | `%LOCALAPPDATA%\Android\Sdk` | **PASS** |
| ADB | 1.0.41 / 36.0.2 | **PASS** |
| JDK | 17 (Microsoft / Adoptium via `setup-android-env.ps1`) | **PASS** |
| Node / npm | v22.13.0 / 11.15.0 | **PASS** |
| Expo SDK | `~54.0.35`, `expo-dev-client` `~6.0.21` | **PASS** |
| Emulator | `Eduvijna_Android_Dev` → `emulator-5554` | **PASS** |
| `google-services.json` | Present at repo root (referenced by `app.json`); contents not logged | **PASS** |

---

## 3. Phase 2 — Local Android development client build

### Exact build command used (working)

```powershell
. .\scripts\setup-android-env.ps1
$env:ANDROID_SERIAL = 'emulator-5554'
$env:EXPO_NO_TELEMETRY = '1'
node scripts/with-eduvijna-api-env.mjs development -- expo run:android --no-bundler
```

### CLI notes (environment-only)

| Issue | Resolution |
|-------|------------|
| `--device emulator-5554` | **FAIL** — Expo treats this as a device *name*, not ADB serial → `CommandError: Could not find device with name: emulator-5554`. Use sole online emulator + `ANDROID_SERIAL`, or omit `--device`. |
| `--port 8082` + `--no-bundler` | **Mutually exclusive** in Expo CLI. Use `--no-bundler` to preserve existing Metro; connect client to `…:8082` via deep link / `REACT_NATIVE_PACKAGER_HOSTNAME`. |
| Gradle wrapper `networkTimeout=10000` | First download timed out. Prefetched `gradle-8.14.3-bin.zip` into wrapper cache; raised local `android/gradle/wrapper/gradle-wrapper.properties` `networkTimeout` to `120000` (file is under gitignored `android/`). |

### Native generation

| Step | Result |
|------|--------|
| `expo run:android` CNG / prebuild | **PASS** — created `./android` (gitignored) |
| Plugin / google-services | **PASS** — `:app:processDebugGoogleServices` ran |
| `expo-dev-client` / launcher plugins | **PASS** — applied in Gradle configure |

### Compilation

| Step | Result | Evidence |
|------|--------|----------|
| `app:assembleDebug` | **PASS** | `BUILD SUCCESSFUL in 40m 54s` (503 tasks) |
| APK path | `D:\Eduvijna-Android-App\Eduvijna\android\app\build\outputs\apk\debug\app-debug.apk` | ~108.7 MB (`113964348` bytes), 2026-10-27 19:56 |
| Package id | `com.eduvijna.app` | aapt / `pm path` |
| versionName / versionCode | `1.0.0` / `1` | dumpsys |
| Dev client schemes | `exp+eduvijna`, `eduvijna`, `expo-dev-launcher` | dumpsys |
| Log | `docs/development/evidence/20261027-expo-lan/android-run-build-3.log` | |

---

## 4. APK installation (emulator)

| Check | Result | Evidence |
|-------|--------|----------|
| Install | **PASS** | Expo CLI: `Installing …\app-debug.apk` |
| `pm path` | **PASS** | `package:/data/app/…/com.eduvijna.app-…/base.apk` |
| Native crash on launch | **PASS** | MainActivity resumes; JS runs |
| Production physical APK overwrite | **N/A** | Emulator only; no physical device targeted |

Post-install Expo briefly opened `…:8081` (CLI default with `--no-bundler`). Corrected by launching:

`exp+eduvijna://expo-development-client/?url=http%3A%2F%2F10.147.219.97%3A8082`

---

## 5. Development client ↔ Metro 8082

| Check | Result | Evidence |
|-------|--------|----------|
| Mode B Metro | **PASS** | `npm run start:device:lan` → `--dev-client --lan --port 8082` |
| Metro local/LAN `/status` | **PASS** | `packager-status:running` |
| Bundle | **PASS** | Metro: `Android Bundled … index.js (2326 modules)` |
| Connected URL | **PASS** | Dev menu: `Connected to: http://10.147.219.97:8082` |
| Fast Refresh | **PASS** | Dev menu toggle **enabled** |
| Initial screen | **PASS** | Sign-in (Email/Username, Password, Sign in) — `devclient-app-loaded.png` |
| Reload | **PASS** | Dev menu Reload → `Running "main"` again — `devclient-after-reload.png` |
| Development API | **PASS** | Log: `apiOrigin: 'https://dev-api.eduvijna.com'` |
| No 8081 dependency for verified path | **PASS** | Active URL uses **8082**; launcher UI may still *display* localhost:8081 as a default field when on Home tab (not used for the verified deep-link session) |

### Usable Mode B URL (session IP)

```text
exp+eduvijna://expo-development-client/?url=http%3A%2F%2F10.147.219.97%3A8082
```

### Transient errors (resolved)

1. First LAN open after install: `SocketTimeoutException` (stale Metro / cold bundle) → fixed by restarting Mode B Metro and relaunching URL.
2. `BundleDownloader` multipart `ProtocolException` during concurrent host bundle fetch → avoid large parallel host downloads while the client loads; restart Metro if needed.
3. Dev menu **Go home** returns to Expo Dev Launcher Home (shows `localhost:8081` placeholder). Re-open via Mode B deep link / Connect to LAN URL — do not treat launcher Home as a failed Metro.

Unrelated JS runtime notes (not fixed here): require-cycle warnings; deprecation warnings for ProgressBarAndroid / SafeAreaView / Clipboard / PushNotificationIOS.

---

## 6. Expo Go Mode A (preserved)

| Item | Value |
|------|-------|
| Command | `npm run start:go:lan` |
| URL | `exp://10.147.219.97:8082` |
| Expo Go on emulator | `54.0.8` (SDK 54) — **PASS** (Phase 1) |

Only one Metro on 8082: stop current process (Ctrl+C) before switching modes.

---

## 7. Physical Android (same LAN)

| Check | Status |
|-------|--------|
| Device on ADB | **PENDING** — only `emulator-5554` listed |
| Phone → `http://10.147.219.97:8082/status` | **PENDING** |
| Expo Go `exp://10.147.219.97:8082` | **PENDING** |
| Dev-client deep link on phone | **PENDING** (install same debug APK or EAS dev build; do not overwrite Founder production app) |

### Founder verification (when phone available)

1. Same Wi-Fi as PC (not guest/client-isolated). Re-run `npm run dev:lan:ip`.
2. Mode A: `npm run start:go:lan` → confirm `/status` on PC → phone browser `http://<LAN>:8082/status` → Expo Go open `exp://<LAN>:8082`.
3. Mode B: stop Mode A → `npm run start:device:lan` → open `exp+eduvijna://expo-development-client/?url=http%3A%2F%2F<LAN>%3A8082`.
4. Do **not** use `10.0.2.2` on a physical phone.

---

## 8. Firewall / LAN security

| Item | Status |
|------|--------|
| Rule `EduVijna Metro Dev 8082 (Private LAN)` | **PASS** — TCP 8082, Domain+Private, LocalSubnet |
| Public / tunnel / ngrok | Not enabled | **PASS** |
| Ensure script | `scripts/ensure-metro-firewall-8082.ps1` | |

---

## 9. Acceptance matrix

| Test | Result |
|------|--------|
| Android emulator ADB | **PASS** |
| Expo Metro 8082 | **PASS** |
| Windows localhost Metro | **PASS** |
| Windows LAN Metro | **PASS** |
| Physical Android LAN | **PENDING** |
| Dev-client APK build | **PASS** |
| Dev-client install | **PASS** |
| Dev-client ↔ Metro + Sign-in UI + reload | **PASS** |
| QR / URLs usable | **PASS** (Mode A `exp://…`, Mode B `exp+eduvijna://…`) |
| Network security LAN-only | **PASS** |
| Development API wrapper | **PASS** |
| App business logic unchanged | **PASS** |

---

## 10. Daily startup commands

```powershell
cd D:\Eduvijna-Android-App\Eduvijna
. .\scripts\setup-android-env.ps1
npm run dev:env:status

# Emulator (if needed)
emulator -avd Eduvijna_Android_Dev
adb wait-for-device

# Mode A — Expo Go
npm run start:go:lan
# exp://<LAN_IP>:8082

# Mode B — development client (stop Mode A first)
npm run start:device:lan
# exp+eduvijna://expo-development-client/?url=http%3A%2F%2F<LAN_IP>%3A8082
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "exp+eduvijna://expo-development-client/?url=http%3A%2F%2F$((npm run -s dev:lan:ip)):8082" com.eduvijna.app

# Rebuild/install debug client (preserves Metro if already on 8082)
$env:ANDROID_SERIAL='emulator-5554'
node scripts/with-eduvijna-api-env.mjs development -- expo run:android --no-bundler
```

Preserved: `npm run start:device`, `npm run config:verify`, `npm run cli:verify`.

---

## 11. Helper scripts

| Script / npm | Purpose |
|--------------|---------|
| `npm run start:go:lan` | Mode A |
| `npm run start:device:lan` | Mode B |
| `npm run start:device` | Backward-compatible Mode B (no forced port in script; pass `-- --port 8082`) |
| `npm run dev:lan:ip` / `dev:metro:port` / `dev:env:status` | Diagnostics |
| `scripts/ensure-metro-firewall-8082.ps1` | Firewall |

---

## 12. Evidence paths

`docs/development/evidence/20261027-expo-lan/`

- `android-run-build-3.log` — Gradle **BUILD SUCCESSFUL**
- `devclient-lan-v2.png` — Connected to `http://10.147.219.97:8082`, Fast Refresh on
- `devclient-app-loaded.png` / `devclient-after-reload.png` — Sign-in UI
- Phase 1 Expo Go / Metro / firewall captures retained

---

## 13. Limitations

1. Physical-phone LAN still **PENDING**.
2. `android/` is generated locally (CNG); first Gradle download may need a long network timeout / prefetch.
3. Emulator may use `10.0.2.2:8082` or `adb reverse` as a fallback; phones must use the Wi-Fi LAN IP.
4. Seven application bug fixes **not** started.
5. iOS native testing **not** claimed on this Windows host.

---

**Final handoff:** `DEVELOPMENT_ENVIRONMENT_READY=true` (emulator + development-client APK + Metro 8082 verified). Physical Android LAN remains **PENDING**.
