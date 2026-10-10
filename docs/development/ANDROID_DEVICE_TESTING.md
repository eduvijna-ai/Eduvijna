# Android device testing (Windows)

Prepares **Expo development builds** against **`https://dev-api.eduvijna.com`** for emulator and physical Wi‑Fi testing. Depends on API environment work in **PR #16** (`chore/mobile-api-environments-from-main`); device setup lives on **`chore/android-device-setup`** (stacked on #16).

## Handoff status

| Target | Status | Notes |
|--------|--------|--------|
| **Emulator** | **Ready** | See [Emulator smoke log](#emulator-smoke-log). |
| **Physical phone (Wi‑Fi)** | **Pending** | Requires a **development-only** Android variant (`com.eduvijna.app.dev`) — see [Development-only Android variant](#development-only-android-variant-prerequisites). Do not overwrite the Founder’s production app. |

Merge order: land **PR #16** first, then **PR #17**.

## Prerequisites

| Component | Expected |
|-----------|----------|
| Android Studio | `C:\Program Files\Android\Android Studio` |
| JDK | **17** — default `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot` (override with `-JdkPath`) |
| Android SDK | Default `%LOCALAPPDATA%\Android\Sdk` (override with `-SdkPath`) |
| Platform | `android-36` |
| Build-Tools | `36.0.0` |
| Emulator | API 36 Google Play x86_64 image |

### Environment (PowerShell)

Dot-source (preserves existing PATH entries; throws if JDK/SDK tools are missing):

```powershell
cd C:\Users\kanne\dev\Eduvijna
. .\scripts\setup-android-env.ps1
# Optional:
# . .\scripts\setup-android-env.ps1 -JdkPath "D:\jdk-17" -SdkPath "D:\Android\Sdk"
```

Sets `JAVA_HOME` to JDK **17**, `ANDROID_HOME` / `ANDROID_SDK_ROOT`, and prepends platform-tools, emulator, and resolved **cmdline-tools** `bin` (`latest`, flat `bin`, or versioned folder).

Verify in a **new** PowerShell window after dot-sourcing:

```powershell
java -version          # 17.x
adb version            # 1.0.41+
emulator -list-avds    # includes Eduvijna_Android_Dev
sdkmanager --version          # functions preset --sdk_root when dot-sourced
avdmanager list avd   # may warn on AVD path; prefer `emulator -list-avds` for boot checks
```

### Hardware acceleration

Hyper-V is active on this host. If the emulator fails to start, enable **Intel VT-x / AMD-V** in BIOS (Founder physical action) and ensure **Windows Hypervisor Platform** / emulator hypervisor driver is installed in SDK Manager.

### SDK command-line tools

If `sdkmanager` reports invalid SDK root:

```powershell
sdkmanager.bat --sdk_root="$env:ANDROID_SDK_ROOT" ...
```

Google’s recommended layout is `%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin`; this host also has `%ANDROID_SDK_ROOT%\cmdline-tools\bin` — the setup script picks the first verified install.

## Emulator: `Eduvijna_Android_Dev`

| Property | Value |
|----------|--------|
| Name | `Eduvijna_Android_Dev` |
| Device profile | `pixel` |
| System image | `system-images;android-36;google_apis_playstore;x86_64` |

Create (if missing):

```powershell
. .\scripts\setup-android-env.ps1
echo no | avdmanager create avd -n Eduvijna_Android_Dev `
  -k "system-images;android-36;google_apis_playstore;x86_64" -d pixel
```

If boot fails with `Broken AVD system path`, ensure `config.ini` contains:

```ini
image.sysdir.1=system-images\android-36\google_apis_playstore\x86_64\
```

(not `Sdk\system-images\...`).

Cold start (validates image path after fix):

```powershell
adb -s emulator-5554 emu kill 2>$null
emulator -avd Eduvijna_Android_Dev -no-snapshot-load
adb wait-for-device
adb devices   # expect emulator-5554   device
```

## Development build (local)

**Branch:** `chore/android-device-setup` (includes `expo-dev-client`).

```powershell
. .\scripts\setup-android-env.ps1
cd C:\Users\kanne\dev\Eduvijna
npm ci
node scripts/with-eduvijna-api-env.mjs development -- expo prebuild --platform android
node scripts/with-eduvijna-api-env.mjs development -- expo run:android
```

Do **not** use `prebuild --clean` unless directed. Generated `android/` and `ios/` are **gitignored**.

## Metro (dev client + LAN)

```powershell
npm run start:device
```

Equivalent:

```powershell
node scripts/with-eduvijna-api-env.mjs development -- expo start --dev-client --lan
```

Uses **stdio inherit** and resolves **`expo`** via `node node_modules/expo/bin/cli` (Windows-safe). Metro QR codes and keyboard shortcuts work in an interactive terminal.

```powershell
npm run config:verify
npm run cli:verify   # eas --version via wrapper (PR #16)
```

## Physical phone (Wi‑Fi) — checklist

**Blocked** until `com.eduvijna.app.dev` is implemented and installed (see prerequisites below).

1. Phone and PC on the **same trusted Wi‑Fi** (not guest/isolated VLAN).
2. Note PC **LAN IPv4** privately (do not commit).
3. `npm run start:device` — Metro on `http://<LAN-IP>:8081`.
4. **Windows Firewall (Private profile only)** — run in **Administrator** PowerShell:

   ```powershell
   New-NetFirewallRule -DisplayName "Expo Metro 8081 (Private)" `
     -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

   Or allow **Node.js** when prompted. Do not disable the firewall.

5. Install the **development** APK for `com.eduvijna.app.dev` only. **Do not** uninstall or replace the production `com.eduvijna.app` Play Store build.

### Production vs debug package (current emulator build)

Local emulator builds today use **`com.eduvijna.app`** (same as production). On a phone with the Play Store app installed, debug install fails with:

```text
INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.eduvijna.app signatures do not match
```

Resolution: ship a **dev variant** (`com.eduvijna.app.dev`) — not yet implemented in this repo.

6. Open dev client → QR or development URL.
7. Sign in with a **development** account; confirm API host **dev-api.eduvijna.com**. Temporary UI edit → Fast Refresh → revert.
8. Optional wireless `adb pair` / `adb connect` (pairing port ≠ connection port; do not commit codes or serials).

### LAN failure diagnostics

Guest/isolated Wi‑Fi, VPN, Private-profile firewall, wrong LAN IP. **Fallback (document only):** `expo start --dev-client --tunnel`.

## Development-only Android variant (prerequisites)

Required before **phone** verification (not implemented in PR #17):

| Setting | Production (unchanged) | Development variant |
|---------|------------------------|---------------------|
| Android `applicationId` / `package` | `com.eduvijna.app` | `com.eduvijna.app.dev` |
| Display name | EduVijna | **Eduvijna Dev** |
| API | Production builds / store | **development** only (`EDUVIJNA_API_ENV=development`) |

**Account-owned configuration still needed (do not invent in repo):**

1. **Firebase Android app** in project `eduvijna-push` registered for package **`com.eduvijna.app.dev`**, plus a **`google-services.json`** (or flavor-specific file) matching that package. Current `google-services.json` only lists **`com.eduvijna.app`**.
2. **Deep links / intent filters:** production uses `https://app.eduvijna.com/openquiz` and scheme **`eduvijna`**. A second installed app may need a distinct scheme (e.g. **`eduvijna-dev`**) and matching host/path policy — confirm with product before changing App Links.
3. **iOS** (future): bundle id `com.eduvijna.app.dev`, `GoogleService-Info.plist`, associated domains — same Firebase project, separate iOS app registration.
4. **EAS / signing:** separate debug or internal profile for the dev application id; production keystore and store listing stay untouched.

Until the above exists, **phone verification remains pending**.

## PR #16 wrapper notes

- **`stdio: 'inherit'`**, **`shell: false`**, production-release guards unchanged.
- **`expo`** → `node node_modules/expo/bin/cli`.
- **`eas`** → `node` + local **`eas-cli`** (devDependency) or global `npm root -g` fallback — not the Expo CLI entry.
- Wrapper tests use `scripts/env-marker.mjs` and a temp file.

## Native camera / gallery / document picker (smoke)

On **emulator**, after **authenticated login** (Document Upload is not available to guests):

1. `adb shell am start -n com.eduvijna.app/.MainActivity`
2. Sign in with a development account.
3. Open **Document Upload**.
4. **Gallery** / **Camera** / **Upload file** — open pickers and **cancel** without uploading or creating production data.

## Emulator smoke log

Recorded **2026-10-10** on Windows (AVD `Eduvijna_Android_Dev`, emulator **36.2.12**):

| Check | Result |
|-------|--------|
| Cold boot `-no-snapshot-load` | **Pass** — `Found systemPath …\system-images\android-36\google_apis_playstore\x86_64\`; `sys.boot_completed=1`; `emulator-5554 device` |
| App UI / dev client | **Pass** — Dev client opened `exp+eduvijna://…` → `MainActivity`; login UI (`No access token found` in Metro logs) |
| API host `dev-api.eduvijna.com` | **Pass** — `adb logcat`: `baseURL: 'https://dev-api.eduvijna.com'` / `/api/v1/auth/logout`; `expo config` → `development` |
| Gallery / camera / document picker | **Pending Founder** — Document Upload requires **authenticated** dev login; no test credentials in repo (do not upload documents) |
| Fast Refresh | **Pass** — Metro rebundled after local `Login.tsx` placeholder edit; change **reverted** before commit |
| Reload / reconnect | **Pass** — JS bundle reload via dev-client URL to `http://10.0.2.2:8081` after Metro restart |
| `npm run config:verify` / `cli:verify` | **Pass** on stacked branch (`eas-cli/16.27.0`) |

## OTA / production

Production OTA publication remains **blocked**. Do not run `npm run update:production` without Founder approval.

## Codex review

Comment `@codex review` on the GitHub pull request.

## Quiz-React reference

| Role | Commit |
|------|--------|
| Deployed web reference (PR #325) | `31ae140f50ccc79079cdfc8c28f2c2d03b60fde7` |
| `origin/main` tip (separate) | `21f9a1d077cfa93341dfd325579cb119085857cf` |
