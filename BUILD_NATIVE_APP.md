# Firebase FCM Native Build Instructions

## ⚠️ Important: Native Build Required

React Native Firebase requires a **native rebuild** because it includes native Android/iOS modules.

---

## 🔧 What's Already Done

✅ Firebase packages installed
✅ Firebase plugins added to app.json
✅ Placeholder google-services.json created
✅ Native code generated (`npx expo prebuild`)

---

## 📱 Complete the Build

### Option 1: Physical Device (Recommended)

1. **Connect Android phone via USB**
   - Enable Developer Options on phone
   - Enable USB Debugging
   - Trust this computer

2. **Run build**:
   ```bash
   cd "g:\Eduvijna"
   npx expo run:android --device
   ```

3. **App installs and runs on your phone**
   - FCM will work correctly
   - Can generate real FCM tokens
   - Test notifications end-to-end

### Option 2: Android Emulator

1. **Start emulator manually**:
   - Open Android Studio
   - AVD Manager → Start emulator
   - Wait for emulator to fully boot

2. **Run build**:
   ```bash
   cd "g:\Eduvijna"
   npx expo run:android
   ```

### Option 3: Build APK Only

```bash
cd "g:\Eduvijna\android"
.\gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

Install manually:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔑 Replace Placeholder Firebase Config

**CRITICAL**: The current `google-services.json` is a placeholder!

### Get Real Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com

2. **Create/Select Project**

3. **Add Android App**:
   - Package name: `com.eduvijna.app`
   - Click "Register app"

4. **Download google-services.json**:
   - Click "Download google-services.json"
   - **Replace** `g:\Eduvijna\google-services.json` with downloaded file

5. **Rebuild**:
   ```bash
   npx expo prebuild --clean
   npx expo run:android --device
   ```

---

## ⚡ Quick Test (After Build)

Once the app is built and running:

1. Navigate: **Profile → 🔬 Test Push Notifications**
2. See **FCM Token** generated (150+ characters)
3. Copy token
4. Test with Firebase Console or backend

---

## 🐛 Troubleshooting

### "Native module not found" error
**Cause**: App running old JavaScript code without native rebuild
**Fix**: Close app completely, rebuild with `npx expo run:android`

### Gradle build fails
**Check**:
- Java version: Should be JDK 17
- Android SDK installed
- Enough disk space (build needs ~2GB)

### App crashes on launch
**Check**:
- google-services.json is valid (not placeholder)
- Package name matches: `com.eduvijna.app`
- Rebuild after replacing config file

---

## 📊 Build Time Estimate

- **First build**: 5-15 minutes (downloads dependencies)
- **Subsequent builds**: 2-5 minutes (incremental)

---

## ✅ Verification

After successful build, you should see:

```
✓ Built app/build/outputs/apk/debug/app-debug.apk (XX MB)
✓ Installing on device
✓ App launched successfully
```

Then in the app:
- TestNotifications screen shows FCM token
- No "Native module not found" errors
- Notifications work correctly

---

## 🔗 Next Steps

1. Build app with real Firebase config
2. Test FCM token generation
3. Set up backend to send notifications
4. Test end-to-end notification flow

See [FIREBASE_FCM_SETUP.md](FIREBASE_FCM_SETUP.md) for complete Firebase setup guide.
