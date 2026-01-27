# 📱 Push Notifications Implementation Guide

## Overview

This document explains how push notifications work in the Eduvijna mobile application, including the complete flow from backend to mobile device.

---

## 🏗️ Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Push Notification Flow                        │
└─────────────────────────────────────────────────────────────────┘

1. Backend API (FastAPI)
   ↓
2. Firebase Cloud Messaging (FCM) / Expo Push Service
   ↓
3. Google/Apple Push Notification Services
   ↓
4. Mobile App (React Native + Expo)
   ↓
5. User sees notification
```

---

## 🔑 Key Technologies

### Frontend (Mobile App)
- **Expo Notifications**: `expo-notifications`
- **Expo Device**: `expo-device`
- **React Native**: Core framework
- **Firebase SDK**: Native Firebase integration

### Backend
- **FastAPI**: Python web framework
- **Firebase Admin SDK**: Server-side Firebase integration
- **PostgreSQL**: Database for storing device tokens

### Services
- **Firebase Cloud Messaging (FCM)**: Primary notification delivery
- **Expo Push Notification Service**: Alternative/backup delivery
- **APNs**: Apple Push Notification service (for iOS)

---

## 📋 Implementation Details

### 1. Mobile App Setup

#### Permissions & Token Generation

**Location**: `src/core/services/PushNotificationService.ts`

```typescript
// Request notification permissions
const { status } = await Notifications.requestPermissionsAsync();

// Get Expo Push Token (managed by Expo)
const expoToken = await Notifications.getExpoPushTokenAsync({
  projectId: '60acc689-aea1-4ce1-9770-4200c1c17c00'
});

// Get FCM/Native Device Token (for Firebase)
const fcmToken = await Notifications.getDevicePushTokenAsync();
```

#### Token Types

1. **Expo Push Token** (Format: `ExponentPushToken[xxx...]`)
   - Managed by Expo
   - Works through Expo's push service
   - No native rebuild required
   - Used for: Quick development and testing

2. **FCM Device Token** (Format: Long alphanumeric string)
   - Native Firebase token
   - Direct connection to FCM
   - Requires native build
   - Used for: Production deployments

#### Token Registration

**Endpoint**: `POST /api/v1/notifications/device/register`

```typescript
// Send token to backend after generation
await fetch('https://api.eduvijna.com/api/v1/notifications/device/register', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    device_token: fcmToken,      // FCM token
    device_type: Platform.OS,     // 'ios' or 'android'
    device_name: Device.modelName,
  }),
});
```

---

### 2. Backend API

#### Device Token Storage

**Database Schema**:
```sql
CREATE TABLE notification_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_token TEXT UNIQUE NOT NULL,
    device_type VARCHAR(10),  -- 'ios' or 'android'
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Send Notification Endpoint

**Endpoint**: `POST /api/v1/notifications/send`

**Request Body**:
```json
{
  "user_id": 12,
  "title": "🎯 New Quiz Assigned",
  "body": "You have been assigned: Mathematics Chapter 5",
  "priority": "high",
  "data": {
    "type": "QUIZ_READY",
    "quiz_id": "12345",
    "screen": "QuizReadyStart"
  }
}
```

**Backend Implementation** (Python/FastAPI):

```python
from firebase_admin import messaging

async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    data: dict = None,
    priority: str = "high"
):
    # Get user's device tokens
    devices = await get_user_devices(user_id)
    
    if not devices:
        raise HTTPException(404, "No registered devices found")
    
    # Prepare FCM message
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data or {},
        android=messaging.AndroidConfig(
            priority=priority,
            notification=messaging.AndroidNotification(
                sound='default',
                channel_id='default',
            ),
        ),
        apns=messaging.APNSConfig(
            payload=messaging.APNSPayload(
                aps=messaging.Aps(
                    sound='default',
                ),
            ),
        ),
    )
    
    # Send to each device
    results = []
    for device in devices:
        try:
            message.token = device.device_token
            response = messaging.send(message)
            results.append({
                "device_id": device.id,
                "success": True,
                "message_id": response
            })
        except Exception as e:
            results.append({
                "device_id": device.id,
                "success": False,
                "error": str(e)
            })
            # If token is invalid, deactivate device
            if "not-registered" in str(e).lower():
                await deactivate_device(device.id)
    
    return results
```

---

### 3. Firebase Configuration

#### Android Setup

**File**: `android/app/google-services.json`
```json
{
  "project_info": {
    "project_id": "eduvijna-push",
    "project_number": "416066207556"
  },
  "client": [{
    "client_info": {
      "package_name": "com.eduvijna.app"
    }
  }]
}
```

**File**: `android/app/build.gradle`
```gradle
dependencies {
    // Firebase BoM
    implementation(platform("com.google.firebase:firebase-bom:34.8.0"))
    
    // Firebase Messaging
    implementation("com.google.firebase:firebase-messaging")
    implementation("com.google.firebase:firebase-analytics")
}
```

#### Backend Firebase Admin Setup

**File**: `firebase-service-account.json`
```json
{
  "type": "service_account",
  "project_id": "eduvijna-push",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "firebase-adminsdk-...@eduvijna-push.iam.gserviceaccount.com"
}
```

**Python Initialization**:
```python
import firebase_admin
from firebase_admin import credentials

cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)
```

---

## 🔄 Complete Notification Flow

### Step-by-Step Process

```
┌────────────────────────────────────────────────────────────────┐
│  STEP 1: App Installation & Setup                              │
└────────────────────────────────────────────────────────────────┘
  User installs app
    ↓
  App requests notification permissions
    ↓
  User grants permissions
    ↓
  App generates FCM token
    ↓
  App sends token to backend
    ↓
  Backend stores token in database

┌────────────────────────────────────────────────────────────────┐
│  STEP 2: Trigger Event (e.g., Quiz Assignment)                 │
└────────────────────────────────────────────────────────────────┘
  Teacher assigns quiz to student
    ↓
  Backend creates quiz assignment
    ↓
  Backend triggers notification function
    ↓
  Notification service called with:
    - user_id: 12
    - title: "New Quiz Assigned"
    - body: "Mathematics Chapter 5"
    - data: { quiz_id: "123", type: "QUIZ_READY" }

┌────────────────────────────────────────────────────────────────┐
│  STEP 3: Backend Processing                                    │
└────────────────────────────────────────────────────────────────┘
  Query database for user's devices
    ↓
  SELECT * FROM notification_devices 
  WHERE user_id = 12 AND is_active = true
    ↓
  Get FCM tokens: ["fcm_token_android_1", "fcm_token_ios_1"]
    ↓
  Create FCM message with notification + data payload

┌────────────────────────────────────────────────────────────────┐
│  STEP 4: Firebase Cloud Messaging                              │
└────────────────────────────────────────────────────────────────┘
  Backend calls Firebase Admin SDK
    ↓
  messaging.send(message)
    ↓
  Firebase validates token and message
    ↓
  Firebase routes to appropriate service:
    - Android → FCM → Google Play Services
    - iOS → FCM → APNs → Apple Push Service

┌────────────────────────────────────────────────────────────────┐
│  STEP 5: Device Receives Notification                          │
└────────────────────────────────────────────────────────────────┘
  Android/iOS receives push notification
    ↓
  App state check:
    
  IF app is CLOSED/BACKGROUND:
    → Show system notification (title + body)
    → User taps notification
    → App opens to specific screen (from data.screen)
  
  IF app is FOREGROUND:
    → In-app notification handler triggered
    → Custom UI shown (optional)
    → Navigate to screen immediately (optional)

┌────────────────────────────────────────────────────────────────┐
│  STEP 6: User Interaction                                      │
└────────────────────────────────────────────────────────────────┘
  User taps notification
    ↓
  App reads notification.data
    ↓
  Extract: type="QUIZ_READY", quiz_id="123", screen="QuizReadyStart"
    ↓
  Navigate to QuizReadyStart screen with quiz_id
    ↓
  User sees quiz and can start
```

---

## 🧪 Testing Push Notifications

### Test Options

#### Option 1: In-App Test Screen

**Location**: Profile → Test Push Notifications

1. Open the app
2. Navigate to Profile screen
3. Tap "🔬 Test Push Notifications"
4. View your tokens:
   - Expo Push Token
   - FCM Device Token
5. Test buttons:
   - **Send Local Notification**: Tests in-app notification handler
   - **Test Backend Notification**: Calls actual API endpoint

#### Option 2: Test Script

**Location**: `scripts/testPushNotification.js`

```bash
# Install dependencies
npm install axios

# Update configuration in file:
# - API_URL
# - AUTH_TOKEN (from login)
# - USER_ID

# Run single test
node scripts/testPushNotification.js

# Run all test notifications
node scripts/testPushNotification.js all
```

#### Option 3: Direct API Call

```bash
curl -X POST https://api.eduvijna.com/api/v1/notifications/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 12,
    "title": "Test Notification",
    "body": "Testing push notifications",
    "priority": "high",
    "data": {
      "type": "TEST",
      "screen": "Home"
    }
  }'
```

#### Option 4: Firebase Console

1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter title and body
4. Click "Send test message"
5. Enter your FCM token
6. Click "Test"

---

## 📊 Notification Types & Data Payloads

### Quiz Assigned
```json
{
  "title": "🎯 New Quiz Assigned",
  "body": "You have been assigned: Mathematics Chapter 5",
  "data": {
    "type": "QUIZ_ASSIGNED",
    "quiz_id": "123",
    "classroom_id": "class-101",
    "screen": "QuizReadyStart"
  }
}
```

### Quiz Graded
```json
{
  "title": "📊 Quiz Results Available",
  "body": "Your score for Science Quiz: 85%",
  "data": {
    "type": "QUIZ_GRADED",
    "quiz_id": "123",
    "student_id": "456",
    "score": "85",
    "screen": "QuizResults"
  }
}
```

### Quiz Reminder
```json
{
  "title": "⏰ Quiz Reminder",
  "body": "Don't forget! History Quiz is due tomorrow",
  "data": {
    "type": "QUIZ_REMINDER",
    "quiz_id": "123",
    "due_date": "2026-01-28",
    "screen": "QuizReadyStart"
  }
}
```

### Achievement
```json
{
  "title": "🏆 Achievement Unlocked",
  "body": "You completed 10 quizzes!",
  "data": {
    "type": "ACHIEVEMENT",
    "achievement_id": "quiz_master",
    "screen": "Profile"
  }
}
```

---

## 🔐 Security & Best Practices

### Token Security

1. **Never expose tokens in client code**
   - Store in AsyncStorage
   - Send via secure HTTPS only
   - Include in Authorization header

2. **Token Refresh**
   - Tokens can expire or become invalid
   - Re-register on app launch
   - Handle token refresh on backend errors

3. **Device Management**
   - Mark devices as inactive when token fails
   - Clean up old/inactive devices periodically
   - Allow users to manage their devices

### Privacy

1. **User Consent**
   - Always request permission first
   - Explain why notifications are needed
   - Allow users to disable notifications

2. **Data Minimization**
   - Only send necessary data in payload
   - Keep notification content brief
   - Don't include sensitive information

### Error Handling

```typescript
// Frontend
try {
  const response = await sendNotification();
  if (!response.ok) {
    // Log error, don't crash app
    console.error('Notification failed:', response.status);
  }
} catch (error) {
  // Handle network errors gracefully
  console.error('Network error:', error);
}

// Backend
try:
    result = messaging.send(message)
except messaging.InvalidArgumentError:
    # Invalid message format
    logger.error("Invalid notification format")
except messaging.UnregisteredError:
    # Token is invalid, deactivate device
    await deactivate_device(device_id)
except Exception as e:
    # Other errors
    logger.error(f"Push notification error: {e}")
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. "No device token found"
**Cause**: Permissions not granted or token generation failed
**Solution**:
- Check notification permissions in device settings
- Ensure app has permission to send notifications
- Verify expo-notifications is installed
- Check console logs for errors

#### 2. "Invalid token" or "not-registered"
**Cause**: Token expired or device uninstalled app
**Solution**:
- Regenerate token on app launch
- Update token in backend
- Clean up invalid tokens in database

#### 3. Notifications not received
**Cause**: Multiple possible issues
**Solutions**:
- Verify FCM is properly configured
- Check firebase-service-account.json is correct
- Ensure google-services.json matches package name
- Test with Firebase Console first
- Check device is not in Do Not Disturb mode

#### 4. Backend returns 404 "No registered devices"
**Cause**: User hasn't registered device token
**Solution**:
- Enable push notifications in Profile screen
- Check device registration API endpoint
- Verify database has token entry

---

## 📱 Platform-Specific Considerations

### Android

- **Notification Channels**: Required for Android 8.0+
- **Battery Optimization**: Can affect background notifications
- **Custom Sounds**: Place in `android/app/src/main/res/raw/`
- **Icon**: Use `android:notification:icon` in app.json

### iOS

- **APNs Certificate**: Required for production
- **Provisional Profile**: Must include push notification entitlement
- **Silent Notifications**: content-available flag needed
- **Badge Count**: Managed via APNs payload

---

## 🔄 Migration Guide

### Moving from Expo Push to Firebase

1. **Add Firebase to project** (✅ Already done)
2. **Update token generation** (✅ Already done)
3. **Update backend to use Firebase Admin SDK**
4. **Test with both services during transition**
5. **Fully migrate to Firebase**
6. **Remove Expo Push dependencies** (optional)

---

## 📈 Monitoring & Analytics

### Metrics to Track

1. **Delivery Rate**: % of notifications successfully delivered
2. **Open Rate**: % of notifications opened by users
3. **Token Refresh Rate**: How often tokens are regenerated
4. **Error Rate**: Failed notification attempts
5. **Device Distribution**: Android vs iOS breakdown

### Firebase Analytics Integration

```typescript
import analytics from '@react-native-firebase/analytics';

// Track notification received
await analytics().logEvent('notification_received', {
  type: notificationData.type,
  quiz_id: notificationData.quiz_id,
});

// Track notification opened
await analytics().logEvent('notification_opened', {
  type: notificationData.type,
  quiz_id: notificationData.quiz_id,
});
```

---

## 📚 Additional Resources

### Documentation
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [FCM HTTP v1 API](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages)

### Tools
- [Firebase Console](https://console.firebase.google.com/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [FCM Testing Tool](https://firebase.google.com/docs/cloud-messaging/concept-options#testing_and_debugging)

---

## ✅ Implementation Checklist

- [x] Install expo-notifications
- [x] Request notification permissions
- [x] Generate Expo Push Token
- [x] Generate FCM Device Token
- [x] Add Firebase to Android project
- [x] Configure google-services.json
- [x] Create device registration endpoint
- [x] Create send notification endpoint
- [x] Implement notification handler
- [x] Add navigation on notification tap
- [x] Create test UI
- [x] Add error handling
- [ ] Set up Firebase Admin SDK on backend
- [ ] Create automated notification triggers
- [ ] Add notification history
- [ ] Implement notification preferences
- [ ] Add iOS support
- [ ] Deploy to production

---

## 🎯 Next Steps

1. **Backend Integration**
   - Implement Firebase Admin SDK on backend
   - Create automated triggers for quiz events
   - Add notification scheduling

2. **Enhanced Features**
   - Notification history/inbox
   - Rich notifications with images
   - Action buttons in notifications
   - Notification grouping

3. **Production Deployment**
   - Test on physical devices
   - Configure production Firebase project
   - Set up monitoring and logging
   - Create notification templates

---

**Last Updated**: January 27, 2026
**Version**: 1.0.0
**Maintained by**: Eduvijna Development Team
