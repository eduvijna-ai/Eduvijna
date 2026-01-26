# Firebase Cloud Messaging (FCM) Setup Guide

## ✅ Changes Implemented

The app now uses **Firebase Cloud Messaging (FCM)** tokens instead of Expo Push Tokens for better reliability and direct Firebase integration.

---

## 📦 Packages Installed

```json
{
  "@react-native-firebase/app": "^21.x",
  "@react-native-firebase/messaging": "^21.x"
}
```

---

## 🔧 Configuration Required

### 1. Firebase Console Setup

#### A. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project or select existing
3. Add Android and/or iOS apps

#### B. Download Configuration Files

**For Android**:
1. In Firebase Console → Project Settings → Your Android App
2. Download `google-services.json`
3. Place in: `android/app/google-services.json`

**For iOS**:
1. In Firebase Console → Project Settings → Your iOS App
2. Download `GoogleService-Info.plist`
3. Place in: `ios/GoogleService-Info.plist`

### 2. Android Configuration

**File**: `android/build.gradle`
```gradle
buildscript {
  dependencies {
    // Add this line
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

**File**: `android/app/build.gradle`
```gradle
apply plugin: "com.android.application"
apply plugin: "com.google.gms.google-services"  // Add this line
```

### 3. iOS Configuration

**Run** (in project root):
```bash
cd ios
pod install
cd ..
```

**File**: `ios/<YourApp>/AppDelegate.mm`
```objective-c
#import <Firebase.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [FIRApp configure];  // Add this line
  // ... rest of your code
}
```

### 4. Rebuild the App

```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

---

## 📱 How It Works Now

### Token Generation
```typescript
// Old (Expo Push Token)
const token = await Notifications.getExpoPushTokenAsync();
// Returns: ExponentPushToken[xxxxxx]

// New (Firebase FCM Token)
const token = await messaging().getToken();
// Returns: FCM token string (150+ chars)
```

### Token Types

| Feature | Expo Push Token | FCM Token |
|---------|----------------|-----------|
| Length | Short (~50 chars) | Long (150+ chars) |
| Format | ExponentPushToken[...] | Random string |
| Platform | Expo-specific | Universal (iOS/Android) |
| Direct Firebase | ❌ No | ✅ Yes |
| Backend Integration | Expo Push API | Firebase Admin SDK |

---

## 🔔 Backend Integration

### Save Device Token

**Endpoint**: `POST /api/v1/notifications/device/register`

```typescript
{
  "user_id": "user-123",
  "device_token": "<FCM_TOKEN>",  // Long Firebase token
  "device_type": "android",  // or "ios"
  "token_type": "fcm"
}
```

### Send Notification via Firebase Admin SDK

**Node.js Backend**:

```javascript
const admin = require('firebase-admin');

// Initialize (do once on server startup)
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

// Send notification
async function sendQuizNotification(fcmToken, quizId, quizTitle) {
  const message = {
    token: fcmToken,
    notification: {
      title: 'New Quiz Available',
      body: `Tap to view: ${quizTitle}`,
    },
    data: {
      type: 'quiz_assigned',
      quiz_id: quizId.toString(),
      quiz_title: quizTitle,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}
```

### Python Backend (using firebase-admin)

```python
import firebase_admin
from firebase_admin import credentials, messaging

# Initialize
cred = credentials.Certificate('path/to/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

def send_quiz_notification(fcm_token, quiz_id, quiz_title):
    message = messaging.Message(
        notification=messaging.Notification(
            title='New Quiz Available',
            body=f'Tap to view: {quiz_title}',
        ),
        data={
            'type': 'quiz_assigned',
            'quiz_id': str(quiz_id),
            'quiz_title': quiz_title,
        },
        token=fcm_token,
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='default',
                sound='default',
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                    badge=1,
                ),
            ),
        ),
    )
    
    try:
        response = messaging.send(message)
        print(f'Notification sent: {response}')
        return {'success': True, 'messageId': response}
    except Exception as e:
        print(f'Error: {e}')
        return {'success': False, 'error': str(e)}
```

---

## 🧪 Testing

### 1. Get FCM Token
1. Open app on physical device
2. Navigate: Profile → "🔬 Test Push Notifications"
3. Copy FCM token (long string)

### 2. Test with Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Click "Send test message"
5. Paste FCM token
6. Click "Test"

### 3. Test with curl (Firebase HTTP v1 API)

```bash
# Get access token first
ACCESS_TOKEN=$(gcloud auth application-default print-access-token)

curl -X POST https://fcm.googleapis.com/v1/projects/<PROJECT_ID>/messages:send \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "token": "<FCM_TOKEN>",
      "notification": {
        "title": "New Quiz Available",
        "body": "Mathematics Quiz - Chapter 5"
      },
      "data": {
        "type": "quiz_assigned",
        "quiz_id": "123",
        "quiz_title": "Math Quiz"
      }
    }
  }'
```

---

## 🔐 Security

### Service Account Key (Backend)

**Never commit to Git!** Store in environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Token Management

- FCM tokens can expire/refresh - listen to `onTokenRefresh()`
- Store tokens in database with user_id
- Update token when user logs in
- Delete token when user logs out

---

## 📊 Token Refresh Handling

**App Side** (already implemented):
```typescript
messaging().onTokenRefresh((newToken) => {
  console.log('🔄 FCM Token refreshed:', newToken);
  // Send to backend to update
  updateDeviceToken(newToken);
});
```

**Backend API**:
```typescript
PUT /api/v1/notifications/device/update
{
  "user_id": "user-123",
  "old_token": "<OLD_FCM_TOKEN>",
  "new_token": "<NEW_FCM_TOKEN>"
}
```

---

## 🆚 Migration from Expo Push Tokens

### Database Update

If you have existing Expo tokens:

```sql
-- Add token_type column
ALTER TABLE device_tokens 
ADD COLUMN token_type VARCHAR(20) DEFAULT 'expo';

-- Mark old tokens
UPDATE device_tokens 
SET token_type = 'expo' 
WHERE device_token LIKE 'ExponentPushToken%';

-- New FCM tokens will be marked as 'fcm'
```

### Backward Compatibility

Support both token types temporarily:

```javascript
async function sendNotification(userId, notification) {
  const devices = await getDeviceTokens(userId);
  
  for (const device of devices) {
    if (device.token_type === 'fcm') {
      // Send via Firebase
      await sendViaFirebase(device.device_token, notification);
    } else if (device.token_type === 'expo') {
      // Send via Expo (legacy)
      await sendViaExpo(device.device_token, notification);
    }
  }
}
```

---

## ❗ Common Issues

### Issue: "Default FirebaseApp is not initialized"
**Fix**: Ensure `[FIRApp configure];` is called in AppDelegate (iOS) or google-services.json is present (Android)

### Issue: No token generated
**Fix**: 
- Check Firebase project is set up
- Verify configuration files are in correct location
- Ensure physical device (not simulator for iOS)
- Check permissions are granted

### Issue: Notifications not received
**Fix**:
- Verify FCM token is correct in backend
- Check Firebase Cloud Messaging is enabled in console
- Ensure app has notification permissions
- Check device is connected to internet

### Issue: Token refresh not working
**Fix**:
- Implement `onTokenRefresh()` listener
- Update backend when token changes
- Don't cache tokens locally for too long

---

## 📁 Modified Files

1. `package.json` - Added Firebase packages
2. `app.json` - Added Firebase plugins
3. `src/screens/TestNotifications.tsx` - Updated to use FCM
4. `src/components/NotificationHandler.tsx` - Added Firebase message listeners

---

## 🔗 Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [FCM Server Implementation](https://firebase.google.com/docs/cloud-messaging/server)
- [React Native Firebase Docs](https://rnfirebase.io/)

---

## ✅ Checklist

Before deploying:
- [ ] Firebase project created
- [ ] `google-services.json` (Android) downloaded and placed
- [ ] `GoogleService-Info.plist` (iOS) downloaded and placed
- [ ] Backend has Firebase Admin SDK initialized
- [ ] Backend can receive and store FCM tokens
- [ ] Backend can send notifications via Firebase
- [ ] Tested on physical device (Android)
- [ ] Tested on physical device (iOS)
- [ ] Token refresh handling implemented
- [ ] Environment variables configured
- [ ] Service account key secured (not in Git)
