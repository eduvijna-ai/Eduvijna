# Push Notifications Implementation Guide

## 📋 Overview

This app uses **Firebase Cloud Messaging (FCM)** for push notifications with a **backend-driven messaging model**. The mobile app only generates and registers native FCM tokens - all push message delivery is handled by the backend.

---

## 🏗️ Architecture

```
┌─────────────────┐      1. Generate Token       ┌─────────────────┐
│   Mobile App    │ ──────────────────────────> │  Expo Native    │
│                 │                               │   FCM Module    │
└────────┬────────┘                               └─────────────────┘
         │                                                  │
         │ 2. Register Token                               │
         │                                                  │
         ▼                                                  │
┌─────────────────┐      3. Store Token          ┌─────────────────┐
│  Backend API    │ ◄──────────────────────────  │  FCM Token      │
│ /notifications/ │                               │  Generated      │
│    devices      │                               └─────────────────┘
└────────┬────────┘
         │
         │ 4. Send Push via Firebase
         │
         ▼
┌─────────────────┐      5. Deliver Push         ┌─────────────────┐
│  Firebase FCM   │ ──────────────────────────> │   Mobile App    │
│    Service      │                               │  (Receives &    │
└─────────────────┘                               │   Displays)     │
                                                  └─────────────────┘
```

**Key Principles:**
- ✅ Frontend only generates and registers tokens
- ✅ Backend handles all push message sending
- ✅ Uses native FCM tokens (preferred)
- ✅ Expo Push Tokens as fallback
- ✅ Token generated only when push is enabled

---

## 🔑 FCM Token Generation

### Token Types

#### 1. **Native FCM Token** (Preferred)
```typescript
// Example: "dXpM3vR2Ty:APA91bH7fKvN8..."
const devicePushToken = await Notifications.getDevicePushTokenAsync();
const fcmToken = devicePushToken.data;
```

**Characteristics:**
- Raw Firebase Cloud Messaging token
- Used directly by Firebase Admin SDK on backend
- Format: `[device_id]:APA91b[token]`
- Best for production use

#### 2. **Expo Push Token** (Fallback)
```typescript
// Example: "ExponentPushToken[xxxxxxxxxxxxxx]"
const expoPushToken = await Notifications.getExpoPushTokenAsync({
  projectId: '60acc689-aea1-4ce1-9770-4200c1c17c00',
});
const token = expoPushToken.data;
```

**Characteristics:**
- Managed by Expo's push notification service
- Can be used with Expo Push Service or converted for FCM
- Fallback when native FCM token fails

### Implementation Flow

**File:** `src/core/services/PushNotificationService.ts`

```typescript
async function getToken(): Promise<string | null> {
  try {
    // 1. Check platform support (Android only)
    if (!isPushSupported()) return null;
    
    // 2. Check cached token
    const cachedToken = await AsyncStorage.getItem('fcmDeviceToken');
    if (cachedToken && !cachedToken.startsWith('ExponentPushToken')) {
      return cachedToken;
    }
    
    // 3. Try to get native FCM token
    try {
      const devicePushToken = await Notifications.getDevicePushTokenAsync();
      token = devicePushToken.data;
      console.log('✅ Native FCM token obtained');
    } catch (deviceTokenError) {
      // 4. Fallback to Expo Push Token
      console.log('⚠️ Falling back to Expo Push Token');
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: '60acc689-aea1-4ce1-9770-4200c1c17c00',
      });
      token = expoPushToken.data;
    }
    
    // 5. Cache token locally
    await AsyncStorage.setItem('fcmDeviceToken', token);
    return token;
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return null;
  }
}
```

**When Token is Generated:**
- ✅ When user enables push notifications
- ✅ On app launch (if push was previously enabled)
- ✅ After login (if push was previously enabled)
- ✅ On token refresh events
- ❌ **NOT** automatically on app install

---

## 📤 Backend Registration

### Registration API

**Endpoint:** `POST /api/notifications/devices`

**Request Body:**
```json
{
  "token": "dXpM3vR2Ty:APA91bH7fKvN8...",
  "platform": "android",
  "device_name": "Samsung Galaxy S21",
  "device_model": "SM-G991B",
  "os_version": "13",
  "app_version": "1.0.0"
}
```

**Success Response:**
```json
{
  "id": 96,
  "token": "dXpM3vR2Ty:APA91bH7fKvN8...",
  "platform": "android",
  "user_id": 123,
  "created_at": "2026-01-28T10:00:00Z"
}
```

### Registration Flow

**File:** `src/core/services/PushNotificationService.ts`

```typescript
async function registerDevice(token: string): Promise<boolean> {
  try {
    // 1. Prepare device metadata
    const metadata = {
      platform: 'android',
      device_name: `${Device.brand} ${Device.modelName}`,
      device_model: Device.modelName,
      os_version: Device.osVersion,
      app_version: '1.0.0',
    };
    
    // 2. Send to backend
    const response = await apiClient.post('/api/notifications/devices', {
      token,
      ...metadata,
    });
    
    // 3. Store device token ID
    await AsyncStorage.setItem('deviceTokenId', response.data.id.toString());
    await AsyncStorage.setItem('lastTokenRegistered', token);
    await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
    
    console.log('✅ Device registered successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to register device:', error);
    throw error;
  }
}
```

**Storage Keys:**
- `fcmDeviceToken` - The FCM token string
- `deviceTokenId` - Backend database ID
- `lastTokenRegistered` - Last successfully registered token
- `pushNotificationsEnabled` - 'true' or 'false'

---

## 📬 Receiving Push Notifications

### Notification Configuration

**File:** `src/core/services/PushNotificationService.ts`

```typescript
// Global notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // Show banner/alert
    shouldPlaySound: true,    // Play notification sound
    shouldSetBadge: true,     // Update app badge
  }),
});

// Android Notification Channel (Required for Android 8.0+)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}
```

### Notification Listeners

**File:** `App.tsx`

```typescript
useEffect(() => {
  if (!isMobile) return;

  // Listen for notifications received while app is in foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('📬 Notification received:', notification);
      // Automatically displayed due to setNotificationHandler config
    }
  );

  // Listen for user tapping on notifications
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('👆 User tapped notification:', response);
      
      const data = response.notification.request.content.data;
      
      // Navigate based on notification data
      if (data?.assessmentId) {
        const deepLinkData: DeepLinkData = {
          type: 'assessment',
          assessmentId: data.assessmentId,
          sessionId: data.sessionId,
        };
        
        handleAssessmentNavigation(deepLinkData, userRole, navHandler);
      }
    }
  );

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}, [isMobile, user]);
```

### Notification Scenarios

| App State | Behavior |
|-----------|----------|
| **Foreground** | Shows banner + Alert dialog (TestNotifications screen) |
| **Background** | Shows in notification tray |
| **Closed** | Shows in notification tray |
| **User Taps** | Opens app & navigates to relevant screen |

---

## 🔄 Lifecycle Management

### On App Launch

**File:** `App.tsx`

```typescript
useEffect(() => {
  if (!isMobile) return;
  
  // Initialize push on app launch (only if previously enabled)
  PushNotificationService.initializeOnAppLaunch().catch(error => {
    console.error('❌ Failed to initialize push:', error);
  });
}, [isMobile]);
```

**What Happens:**
1. Checks if push was previously enabled
2. Verifies platform support
3. If enabled but no token, generates new token
4. Registers token with backend if changed
5. Skips if push was never enabled

### After Login

**File:** `App.tsx`

```typescript
useEffect(() => {
  if (!isMobile || !isAuthenticated) return;
  
  // Sync push status after login
  PushNotificationService.syncStatusAfterLogin().catch(error => {
    console.error('❌ Failed to sync push:', error);
  });
}, [isMobile, isAuthenticated]);
```

**What Happens:**
1. Checks if push was enabled before login
2. Re-generates token if missing
3. Re-registers with backend if needed
4. Associates token with authenticated user

### Token Refresh

**File:** `src/core/services/PushNotificationService.ts`

```typescript
async function handleTokenRefresh(): Promise<void> {
  const status = await getPushStatus();
  
  // Only refresh if push is enabled
  if (!status.isEnabled) return;
  
  // Get new token
  const newToken = await getToken();
  
  // Check if token changed
  const lastRegistered = await AsyncStorage.getItem('lastTokenRegistered');
  if (lastRegistered === newToken) return;
  
  // Register new token with backend
  await registerDevice(newToken);
}
```

**When Tokens Refresh:**
- Firebase invalidates old tokens
- App reinstalled or data cleared
- Device OS update
- Google Play Services update

---

## 🧪 Testing Push Notifications

### Using TestNotifications Screen

**File:** `src/screens/TestNotifications.tsx`

**Step-by-Step Testing:**

1. **Open TestNotifications Screen**
   ```typescript
   navigation.navigate('TestNotifications');
   ```

2. **Generate Token**
   - Click "Get FCM Token"
   - Wait for confirmation
   - Token displayed on screen

3. **Register with Backend**
   - Click "Register with Backend"
   - Wait for "✅ Registered with backend"
   - Check registration status shows green ✅

4. **Test Local Notification**
   - Click "Test Local Notification"
   - Should show immediately
   - Verifies notification display works

5. **Test Backend Notification**
   - Click "Test Backend Notification"
   - Backend sends via Firebase
   - Should receive notification in ~1-3 seconds

### Backend Test Notification

**Request:**
```bash
POST /api/notifications/send-test
Authorization: Bearer <access_token>

{
  "device_id": 96,
  "title": "Test Notification",
  "body": "This is a test from backend"
}
```

**Expected Response:**
```json
{
  "success_count": 1,
  "failed_count": 0,
  "notification_ids": [96],
  "errors": null
}
```

### Debugging Checklist

**If notifications not received:**

- [ ] Check device notification settings (Settings > Apps > Your App > Notifications)
- [ ] Verify registration status shows "✅ Registered with backend"
- [ ] Check token type (Native FCM preferred, Expo as fallback)
- [ ] Verify backend received token (check database)
- [ ] Check backend logs for FCM API errors
- [ ] Test local notification first (verifies display works)
- [ ] Ensure app has latest notification channel config
- [ ] Try clearing app data and re-registering

**Console Logs to Check:**
```
✅ Native FCM token obtained
📤 Registering device with backend...
✅ Device registered successfully
🔔 Setting up notification listeners...
📬 Notification received in foreground:
👆 User tapped notification:
```

---

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Property 'deviceToken' doesn't exist"
**Cause:** Trying to access wrong property in token response  
**Fix:** Use `devicePushToken.data` not `devicePushToken.deviceToken`

#### 2. "Backend expects FCM tokens but receiving Expo"
**Cause:** `getDevicePushTokenAsync()` failed  
**Fix:** Check device supports native FCM, verify google-services.json configured

#### 3. "Notification sent but not received"
**Cause:** No notification listeners set up  
**Fix:** Ensure listeners in App.tsx are active (check logs for "🔔 Setting up notification listeners")

#### 4. "Permission denied"
**Cause:** User denied notification permission  
**Fix:** Guide user to Settings > Apps > Permissions > Notifications

#### 5. "Token registration failed - 401"
**Cause:** User not authenticated  
**Fix:** Ensure user is logged in before registering token

---

## 📁 File Structure

```
src/
├── core/
│   ├── services/
│   │   ├── PushNotificationService.ts      # Core push notification logic
│   │   ├── deepLinkNavigationHandler.ts    # Handle notification navigation
│   │   └── tokenStorage.ts                 # Auth token management
│   └── hooks/
│       └── useAuth.ts                       # Authentication context
├── screens/
│   └── TestNotifications.tsx               # Testing interface
└── App.tsx                                  # Notification listeners setup
```

---

## 🔐 Security Considerations

1. **Token Storage**
   - Stored in AsyncStorage (encrypted on device)
   - Never exposed in logs (only first 30 chars)
   - Cleared on logout

2. **Backend Validation**
   - Requires authentication to register tokens
   - Validates token format before storage
   - Associates tokens with user accounts

3. **Permission Handling**
   - Always requests permission before generating token
   - Respects user's permission choices
   - Allows re-prompting if denied

---

## 📊 Push Status API

### Get Current Status

```typescript
const status = await PushNotificationService.getPushStatus();

console.log(status);
// {
//   isEnabled: true,
//   hasPermission: true,
//   hasToken: true,
//   isSupported: true
// }
```

### Enable Push Notifications

```typescript
const result = await PushNotificationService.enablePushNotifications();

if (result.success) {
  console.log('✅ Push enabled:', result.token);
} else {
  console.error('❌ Failed:', result.message);
}
```

### Disable Push Notifications

```typescript
const result = await PushNotificationService.disablePushNotifications();

if (result.success) {
  console.log('✅ Push disabled');
}
```

---

## 🎯 Best Practices

1. **Only Generate Tokens When Needed**
   - Don't generate on app install
   - Wait for user to enable push
   - Respects user privacy

2. **Handle Token Refresh**
   - Listen for token change events
   - Re-register automatically
   - Log refresh events

3. **Error Handling**
   - Always use try-catch
   - Provide fallback mechanisms
   - Log errors for debugging

4. **User Experience**
   - Show clear permission prompts
   - Explain benefits before asking
   - Provide easy opt-out

5. **Testing**
   - Test on real devices (not emulator)
   - Test all app states (foreground, background, closed)
   - Verify navigation from notifications

---

## 📝 Summary

**What Frontend Does:**
- ✅ Generates FCM tokens (when user enables push)
- ✅ Requests notification permissions
- ✅ Registers tokens with backend API
- ✅ Listens for incoming notifications
- ✅ Handles notification display and navigation
- ✅ Manages token refresh

**What Frontend Does NOT Do:**
- ❌ Send push notifications
- ❌ Manage notification content
- ❌ Handle notification scheduling
- ❌ Determine who receives notifications

**Backend Responsibilities:**
- ✅ Store device tokens
- ✅ Send push notifications via Firebase Admin SDK
- ✅ Manage notification content and targeting
- ✅ Handle notification scheduling
- ✅ Track delivery status

---

## 🔗 Additional Resources

- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Android Notification Channels](https://developer.android.com/training/notify-user/channels)
- [Deep Linking in React Navigation](https://reactnavigation.org/docs/deep-linking/)

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Platform:** Android (iOS support planned)
