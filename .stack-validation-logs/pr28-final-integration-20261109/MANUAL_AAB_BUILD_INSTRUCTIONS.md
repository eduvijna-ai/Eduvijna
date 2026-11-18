# Manual Production AAB Build Instructions (post PR #28 merge)

**Do not run these steps as part of the integration task.** Founder/authorized release operator only.

## Source of truth
- Repo: `eduvijna-ai/Eduvijna`
- Branch: `main`
- Merge commit: `475158fd4005019cc6b2e0f67e42b54c340c2bb4`
- Includes feature SHA: `0836ac5adefbcc65869ac57acd4cdf9b39deac8e`
- Isolated verification checkout already prepared: `D:\wt\eduvijna-main-postmerge-475158f` (or create a new clean worktree)

## Required production identity
- Package: `com.eduvijna.app`
- App name: `EduVijna`
- Firebase project: `eduvijna-push`
- Firebase client file: `google-services.json` (production; committed)
- API: `https://eduapi.eduvijna.com`
- Artifact: `.aab`
- Native task: `:app:bundleRelease`

## Critical guards
1. Use a **clean isolated checkout** of `origin/main` @ `475158f` (or newer if main advances). Do **not** use Founder WIP main, feature DEV worktrees, or PlayRelease as the build tree unless separately authorized.
2. **Do not set** `EDUVIJNA_APP_VARIANT=development`. Default/production must remain unset or `production`.
3. Set `EDUVIJNA_API_ENV=production` (or use `production-release` helper script) before prebuild/export.
4. Confirm `google-services-dev.json` is **not** used. Production must resolve `./google-services.json`.
5. Confirm resolved Expo config:
   - name `EduVijna`
   - package `com.eduvijna.app`
   - `API_BASE_URL=https://eduapi.eduvijna.com`
   - scheme `eduvijna`
6. `eas.json` `production.autoIncrement` applies to **EAS remote builds only**. Manual Gradle `bundleRelease` does **not** inherit that auto-increment. Before building, set `android.defaultConfig.versionCode` (and versionName if needed) in the generated `android/app/build.gradle` to a value **higher** than the versionCode already uploaded to Google Play.
7. Use only the existing authorized Google Play **upload-signing** process. Do not inspect or disclose keystore/credentials.
8. Do not generate/sign/upload/publish as part of this integration task.

## Suggested command sequence (manual, Founder-authorized)
```powershell
# 1) Fresh worktree from merged main
git fetch origin main
git worktree add --detach D:\wt\eduvijna-aab-<SHA> origin/main
cd D:\wt\eduvijna-aab-<SHA>
npm ci

# 2) Prove production identity (DEV variant NOT enabled)
Remove-Item Env:EDUVIJNA_APP_VARIANT -ErrorAction SilentlyContinue
$env:EDUVIJNA_API_ENV='production'
npm run config:verify
npx --no-install expo config --type public --json
# Expect: package com.eduvijna.app, googleServicesFile ./google-services.json, API_BASE_URL https://eduapi.eduvijna.com

# 3) Native project + JS bundle for release
npx --no-install expo prebuild --platform android --no-install

# 4) Manually raise versionCode above Play Store current value (EDIT android/app/build.gradle)
#    Do NOT assume EAS autoIncrement applies here.

# 5) Bundle
cd android
.\gradlew.bat :app:bundleRelease --no-daemon

# 6) Expected AAB path
# android\app\build\outputs\bundle\release\app-release.aab
```

## Artifact verification checklist
- [ ] File exists at `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] `bundletool` / Play Console pre-check: package `com.eduvijna.app`
- [ ] versionCode > currently uploaded Play versionCode
- [ ] Embedded JS is release bundle (not Metro/dev-client launcher)
- [ ] Firebase client in build is production `google-services.json` / project `eduvijna-push`
- [ ] Signed with authorized Play upload key (existing process)
- [ ] No `com.eduvijna.app.dev` identity in the AAB

## Explicit non-goals for this integration
- PLAY_STORE_UPLOAD_AUTHORIZED=false
- PRODUCTION_DEPLOYMENT_PERFORMED=false
- Backend production FCM readiness remains a separate release gate
