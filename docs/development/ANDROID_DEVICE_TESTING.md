# Android device testing (Windows)

Prepares **Expo development builds** against **`https://dev-api.eduvijna.com`** for emulator and physical Wi‑Fi testing. Depends on API environment work in **PR #16** (`chore/mobile-api-environments-from-main`); this device setup lives on **`chore/android-device-setup`**.

## Handoff status

| Target | Status | Notes |
|--------|--------|--------|
| **Emulator** | **Ready** | AVD `Eduvijna_Android_Dev` boots; `adb devices` shows `emulator-5554 device`; debug dev client `com.eduvijna.app` v1.0.0 installed from local `expo run:android` (development env). |
| **Physical phone (Wi‑Fi)** | **Pending — Founder** | No USB/Wi‑Fi `adb` device was connected during setup. Same Android `package` as production (`com.eduvijna.app` in `app.json`); a debug APK **cannot** install alongside the Play Store build without a signature conflict — see [Production vs debug package](#production-vs-debug-package). |

Merge order: land **PR #16** first, then **PR #17** (stacked on the API env branch).

## Prerequisites

| Component | Expected |
|-----------|----------|
| Android Studio | `C:\Program Files\Android\Android Studio` |
| JDK | **17** — `C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot` |
| Android SDK | `%LOCALAPPDATA%\Android\Sdk` |
| Platform | `android-36` |
| Build-Tools | `36.0.0` (also `36.1.0` present) |
| Emulator | API 36 Google Play x86_64 image |

### Environment (PowerShell)

Dot-source (does **not** remove existing PATH entries):

```powershell
cd C:\Users\kanne\dev\Eduvijna
. .\scripts\setup-android-env.ps1
```

Sets `JAVA_HOME` to JDK **17** (corrects legacy `JAVA_HOME` pointing at JDK 11), plus `ANDROID_HOME` / `ANDROID_SDK_ROOT`.

Verify:

```powershell
java -version          # 17.x
adb version            # 1.0.41+
emulator -list-avds    # includes Eduvijna_Android_Dev
```

### Hardware acceleration

Hyper-V is active on this host. `VirtualizationFirmwareEnabled` may read **false** in WMI while the emulator still runs; if the emulator fails to start, enable **Intel VT-x / AMD-V** in BIOS (Founder physical action) and ensure **Windows Hypervisor Platform** / emulator hypervisor driver is installed in SDK Manager.

### SDK command-line tools

If `sdkmanager` reports invalid SDK root, pass:

```powershell
sdkmanager.bat --sdk_root="$env:LOCALAPPDATA\Android\Sdk" ...
```

Prefer relocating cmdline-tools to `%ANDROID_SDK_ROOT%\cmdline-tools\latest\` when upgrading tools (Google layout).

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

Start:

```powershell
emulator -avd Eduvijna_Android_Dev
adb devices   # expect emulator-5554   device
```

## Development build (local)

**Branch:** `chore/android-device-setup` (includes `expo-dev-client` via `npx expo install expo-dev-client`).

```powershell
. .\scripts\setup-android-env.ps1
cd C:\Users\kanne\dev\Eduvijna
npm ci
# Native project (first time only; no --clean)
node scripts/with-eduvijna-api-env.mjs development -- expo prebuild --platform android
node scripts/with-eduvijna-api-env.mjs development -- expo run:android
```

Generated `android/` and `ios/` are **gitignored** — do not commit unless the team adopts checked-in native trees.

## Metro (dev client + LAN)

```powershell
npm run start:device
```

Equivalent:

```powershell
node scripts/with-eduvijna-api-env.mjs development -- expo start --dev-client --lan
```

Uses **stdio inherit** and resolves `expo` via `node …/expo/bin/cli` (Windows-safe). Metro QR codes and keyboard shortcuts work in an interactive terminal.

Verify API env at config time:

```powershell
npm run config:verify
```

## Physical phone (Wi‑Fi) — checklist

1. Phone and PC on the **same trusted Wi‑Fi** (not guest/isolated VLAN).
2. Note PC **LAN IPv4** privately (Settings → Network; do not commit to git).
3. `npm run start:device` — confirm Metro advertises `http://<LAN-IP>:8081`.
4. **Windows Firewall (Private profile only):**

   ```powershell
   New-NetFirewallRule -DisplayName "Expo Metro 8081 (Private)" `
     -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Private
   ```

   Or allow the **Node.js** executable when Windows prompts on first LAN connection. Do not disable the firewall.

5. Install **development** APK (`expo run:android` with USB or `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`). **Do not** uninstall the Founder’s production app or clear its data without explicit approval.

### Production vs debug package

Both production and local development builds use **`com.eduvijna.app`** (production identity preserved). If the Play Store app is already installed, `adb install` typically fails with:

```text
INSTALL_FAILED_UPDATE_INCOMPATIBLE: Package com.eduvijna.app signatures do not match
```

Stop and choose a path with the Founder (e.g. test on emulator only, USB-only side-by-side workflow, or a future dev-only `applicationId` — out of scope for this setup PR).
6. Open dev client → scan QR or enter development URL.
7. Confirm requests hit **dev-api** (login screen / network inspector). Optional: temporary UI text change → Fast Refresh → revert.
8. **Wireless debugging (optional):** Android Studio → *Pair Devices Using Wi‑Fi*, or `adb pair` / `adb connect` using **pairing port** and **connection port** from the phone (often different). Do not commit pairing codes or device serials.

### LAN failure diagnostics

- Guest network / AP isolation
- VPN on PC or phone
- Firewall blocking 8081 on Private profile
- **Fallback (document only):** `expo start --dev-client --tunnel` (slower; requires network). Not enabled by default.

## PR #16 wrapper notes

- `scripts/with-eduvijna-api-env.mjs` uses **`stdio: 'inherit'`** for real commands.
- Expo/EAS invoked as **`process.execPath` + `node_modules/expo/bin/cli`** (not `.cmd` shims).
- Wrapper tests use `scripts/env-marker.mjs` writing to a **temp file** (production path stays inherit-only).

## Native camera / gallery / document picker (smoke, no uploads)

On **emulator** (logged in or guest — do **not** complete real document uploads to production backends):

1. Launch dev client: `adb shell am start -n com.eduvijna.app/.MainActivity`
2. Navigate to **Document Upload** (tab or workspace entry).
3. Tap **Gallery** — expect system photo picker (emulator may offer sample images).
4. Tap **Camera** — expect camera UI (emulator virtual camera; cancel without saving).
5. Tap **Upload file** — expect `expo-document-picker` sheet; cancel without selecting.

Confirm permission prompts appear once and the app does not crash. Revert any temporary UI edits used for Fast Refresh checks.

## OTA / production

Production OTA publication remains **blocked** until EAS channel/branch and environment policy are verified. Do not run `npm run update:production` without Founder approval.

## Codex review

Request on each PR: comment `@codex review` on the GitHub pull request.

## Quiz-React reference

| Role | Commit |
|------|--------|
| Deployed web reference (PR #325) | `31ae140f50ccc79079cdfc8c28f2c2d03b60fde7` |
| `origin/main` tip (separate) | `21f9a1d077cfa93341dfd325579cb119085857cf` |

Read-only worktree (preserve existing `Quiz-React` checkout):

```powershell
git -C ..\Quiz-React fetch origin
git -C ..\Quiz-React worktree add ..\Quiz-React-Deployed-Reference 31ae140f50ccc79079cdfc8c28f2c2d03b60fde7
```
