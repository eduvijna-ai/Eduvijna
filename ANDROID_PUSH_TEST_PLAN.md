# Android Push Notification Testing Plan

## Changes Made

### 1. App.tsx - Added Push Notification Listeners ✅
- Added `Notifications.setNotificationHandler` to show alerts when app is in foreground
- Added `notificationListener` to handle received notifications
- Added `responseListener` to handle notification taps
- Configured navigation when notifications are tapped

### 2. AndroidManifest.xml - Added Required Permissions ✅
- `android.permission.POST_NOTIFICATIONS` - Required for Android 13+
- `android.permission.RECEIVE_BOOT_COMPLETED` - Allow notifications after device restart
- `android.permission.WAKE_LOCK` - Keep device awake for notification delivery

### 3. Existing Configuration (Already in Place)
- ✅ Firebase SDK configured in `android/build.gradle`
- ✅ `google-services.json` in place
- ✅ FCM token generation in Profile.tsx and TestNotifications.tsx
- ✅ Backend API integration working (201 responses)
- ✅ Device already registered (OPPO CPH1823, device ID 39)

## Testing Steps

### Step 1: Rebuild Android App
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

Or use Expo:
```bash
npx expo prebuild --clean
npx expo run:android
```

### Step 2: Verify App Installation
1. App should install on OPPO CPH1823 device
2. Open the app and login
3. Navigate to Profile screen

### Step 3: Enable Push Notifications
1. Toggle "Enable Push Notifications" ON in Profile screen
2. Check console logs for FCM token generation
3. Verify token is stored in AsyncStorage

### Step 4: Test Notification Reception

#### Option A: Using TestNotifications Screen
1. Navigate to TestNotifications screen
2. Click "Test Backend Notification" button
3. Should see success message with notification ID
4. **Notification should appear on device** (banner/sound/vibration)

#### Option B: Using Node.js Test Script
```bash
node testPushNotification.js
```
Expected output:
```
✅ Login successful! User ID: 12
✅ Notification sent successfully!
   Notification IDs: [87]
   Status: 201
```

#### Option C: From Web Dashboard
1. Login to https://ui.eduvijna.com
2. Navigate to notifications section
3. Send notification to user ID 12
4. **Should receive on Android device**

### Step 5: Test Notification States

#### Test 1: App in Foreground
1. Keep app open
2. Send test notification
3. **Expected:** Notification banner appears within app
4. **Check console:** Should log "📬 Notification received:"

#### Test 2: App in Background
1. Press home button (app in background)
2. Send test notification
3. **Expected:** Notification appears in system tray
4. Tap notification
5. **Expected:** App opens and navigates to relevant screen
6. **Check console:** Should log "👆 Notification tapped:"

#### Test 3: App Closed
1. Swipe away app from recent apps
2. Send test notification
3. **Expected:** Notification appears in system tray
4. Tap notification
5. **Expected:** App launches and navigates to relevant screen

### Step 6: Verify Notification Data
Send notification with custom data:
```bash
# Update testPushNotification.js with:
const notificationPayload = {
  user_ids: [12],
  notification: {
    title: "Test Quiz Available",
    body: "Tap to start your quiz",
    data: {
      type: "quiz",
      quizId: "123",
      sessionId: "456"
    }
  }
};
```

Expected: Tapping notification should navigate to QuizTakingScreen with params

## Troubleshooting

### Issue: Notifications not appearing
**Check:**
1. Notification permission granted on device (Settings > Apps > Eduvijna > Notifications)
2. FCM token generated and stored (check AsyncStorage)
3. Device registered with backend (check testDeviceRegistration.js output)
4. Backend API returning 201 status

### Issue: App crashes on notification
**Check:**
1. Console logs for errors
2. Ensure notification data format is correct
3. Verify navigation screens exist

### Issue: Notification appears but doesn't navigate
**Check:**
1. Console log "👆 Notification tapped:" appears
2. Navigation ref is initialized
3. Screen names match exactly

### Issue: Token generation fails
**Check:**
1. `google-services.json` is in `android/app/`
2. Package name matches: `com.eduvijna.app`
3. Firebase project configured correctly
4. Rebuild app after Firebase changes

## Success Criteria

✅ **Complete Success:**
1. Notification appears on device in all states (foreground/background/closed)
2. Notification plays sound and shows banner
3. Tapping notification opens app and navigates correctly
4. Console logs show proper event handling
5. Backend API returns 201 status

## Next Steps After Success

1. Implement notification channels for different notification types
2. Add notification badges
3. Implement notification history
4. Add notification settings (sound, vibration preferences)
5. Test on multiple Android versions (especially Android 13+)

## Commands Reference

```bash
# Clean and rebuild Android
cd android && ./gradlew clean && cd .. && npx expo run:android

# Test device registration
node testDeviceRegistration.js

# Test notification send
node testPushNotification.js

# Check Android logs
npx expo run:android --no-build-cache

# View device logs
adb logcat | grep -i "expo\|firebase\|notification"
```

## Configuration Files Modified

1. [App.tsx](App.tsx) - Lines ~158-195 (notification listeners)
2. [android/app/src/main/AndroidManifest.xml](android/app/src/main/AndroidManifest.xml) - Lines 3-6 (permissions)
3. [Profile.tsx](src/screens/Profile.tsx) - FCM token generation
4. [TestNotifications.tsx](src/screens/TestNotifications.tsx) - UI test button
5. [PushNotificationService.ts](src/services/PushNotificationService.ts) - Correct project ID

## Important Notes

- **Must rebuild Android app** for manifest permission changes to take effect
- Device OPPO CPH1823 is already registered as device ID 39
- Backend API confirmed working (https://api.eduvijna.com)
- User ID 12 is test account
- Project ID: 60acc689-aea1-4ce1-9770-4200c1c17c00
