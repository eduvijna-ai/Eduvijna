# Android device testing (Windows)

Prepares **Expo development builds** against **`https://dev-api.eduvijna.com`** for emulator and physical Wi‑Fi testing. Depends on API environment work in **PR #16** (`chore/mobile-api-environments-from-main`); this device setup lives on **`chore/android-device-setup`**.

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
4. **Windows Firewall:** allow **Node.js** / Metro on **Private** networks only (port **8081**). Do not disable the firewall.
5. Install **development** APK (`expo run:android` with USB or `adb install` of debug APK). **Do not** replace the Founder’s **production** Play Store app (`com.eduvijna.app` production signing). If install fails with signature/package conflict, stop and report the exact `adb` error before uninstalling anything.
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
