# API-Based Push Notifications Implementation

## Overview
The Eduvijna app uses an **API-based notification system** where the backend handles all Firebase Cloud Messaging (FCM) operations using the Firebase Admin SDK. The mobile app polls the backend API for new notifications instead of receiving push notifications directly through FCM.

## Architecture

```
Backend (Firebase Admin SDK)
    ↓
    ↓ Firebase Credentials: eduvijna-app-firebase-adminsdk.json
    ↓
Backend API Endpoints
    ↓
    ↓ HTTP API Calls (polling every 30s)
    ↓
Mobile App (Expo)
```

## Backend Setup

### Firebase Credentials
- **Path**: `eduvijna-app-firebase-adminsdk.json`
- **Location**: Backend server root directory
- **Type**: Firebase Admin SDK service account key

### API Endpoints

#### 1. Fetch Notifications
```http
GET /api/notifications/fetch
Parameters:
  - user_id (number, required)
  - since (ISO timestamp, optional) - only return notifications after this time

Response:
{
  "success": true,
  "notifications": [
    {
      "id": "notif_123",
      "title": "New Quiz Available",
      "body": "Quiz: Introduction to React",
      "type": "new_quiz",
      "data": {
        "quiz_id": "quiz_456",
        "session_id": "session_789",
        "quiz_title": "Introduction to React",
        "teacher_name": "John Doe"
      },
      "timestamp": "2026-01-26T10:30:00Z",
      "read": false
    }
  ],
  "unread_count": 3
}
```

#### 2. Mark as Read
```http
POST /api/notifications/mark-read
Body:
{
  "notification_id": "notif_123",
  "user_id": 456
}

Response:
{
  "success": true
}
```

#### 3. Mark All as Read
```http
POST /api/notifications/mark-all-read
Body:
{
  "user_id": 456
}

Response:
{
  "success": true
}
```

#### 4. Send Notification
```http
POST /api/notifications/send
Body:
{
  "user_id": 123,  // Single user (optional)
  "user_ids": [123, 456, 789],  // Multiple users (optional)
  "title": "New Announcement",
  "body": "Check out the latest updates",
  "type": "announcement",
  "data": {
    "custom_field": "value"
  }
}

Response:
{
  "success": true,
  "message": "Notification sent",
  "sent_count": 3
}
```

#### 5. Send Quiz Notification
```http
POST /api/notifications/send-quiz-notification
Body:
{
  "user_ids": [123, 456],
  "quiz_id": "quiz_789",
  "quiz_title": "Introduction to React",
  "teacher_name": "John Doe",
  "session_id": "session_abc"  // optional
}

Response:
{
  "success": true,
  "message": "Quiz notifications sent",
  "sent_count": 2
}
```

## Mobile App Implementation

### 1. Notification Polling Service
**File**: `src/core/services/NotificationPollingService.ts`

- Polls backend every **30 seconds** when app is in foreground
- Polls every **60 seconds** when app is in background
- Automatically adjusts polling interval based on app state

**Usage**:
```typescript
import notificationPollingService from '@core/services/NotificationPollingService';

// Start polling
notificationPollingService.start(userId, (notifications) => {
  // Handle new notifications
  console.log('New notifications:', notifications);
});

// Stop polling
notificationPollingService.stop();

// Manual poll
await notificationPollingService.pollNow();
```

### 2. Notifications API
**File**: `src/core/api/device.api.ts`

```typescript
import notificationsAPI from '@core/api/device.api';

// Fetch notifications
const response = await notificationsAPI.fetchNotifications(userId, sinceTimestamp);

// Mark as read
await notificationsAPI.markAsRead(notificationId, userId);

// Mark all as read
await notificationsAPI.markAllAsRead(userId);

// Send notification
await notificationsAPI.sendNotification({
  user_ids: [123, 456],
  title: 'New Quiz',
  body: 'Check it out!',
  type: 'new_quiz',
  data: { quiz_id: '789' }
});

// Send quiz notification
await notificationsAPI.sendQuizNotification({
  user_ids: [123, 456],
  quiz_id: 'quiz_789',
  quiz_title: 'React Basics',
  teacher_name: 'John Doe'
});
```

### 3. Notification Polling Hook
**File**: `src/core/hooks/useFCM.ts`

```typescript
import { useNotificationPolling } from '@core/hooks/useFCM';

function MyComponent() {
  const { polling, lastPoll, error, pollNow } = useNotificationPolling();
  
  // Polling starts automatically when user logs in
  // Stops automatically when user logs out
  
  // Manual poll
  const handleRefresh = async () => {
    await pollNow();
  };
  
  return (
    <View>
      <Text>Polling: {polling ? 'Active' : 'Inactive'}</Text>
      <Text>Last Poll: {lastPoll?.toLocaleTimeString()}</Text>
      {error && <Text>Error: {error}</Text>}
      <Button onPress={handleRefresh}>Refresh Now</Button>
    </View>
  );
}
```

### 4. Notification Handler
**File**: `src/components/NotificationHandler.tsx`

- Displays notifications when app is in foreground
- Handles notification taps and navigates to appropriate screens
- Supports deep linking to quiz screens

**Notification Types & Navigation**:
- `new_quiz` → Navigate to Quiz Preview Screen
- `quiz_graded` → Navigate to Quiz Results Screen
- `classroom_invite` → Navigate to Classes List
- `announcement` → Navigate to Notifications Screen
- `general` → Navigate to Notifications Screen or Quiz (if quiz_id present)

### 5. App Integration
**File**: `App.tsx`

```typescript
import { useNotificationPolling } from './src/core/hooks/useFCM';

function AppContent() {
  const notificationPolling = useNotificationPolling();
  
  // Polling starts automatically after login
  // Hook handles all lifecycle management
  
  return <YourApp />;
}
```

## Notification Data Structure

### Standard Notification Object
```typescript
interface NotificationMessage {
  id: string;                    // Unique notification ID
  title: string;                 // Notification title
  body: string;                  // Notification message
  type: 'new_quiz' | 'quiz_graded' | 'classroom_invite' | 'announcement' | 'general';
  data?: {
    quiz_id?: string;            // For quiz-related notifications
    session_id?: string;         // Quiz session ID
    quiz_title?: string;         // Quiz title
    teacher_name?: string;       // Teacher who created quiz
    classroom_id?: string;       // Classroom ID
    [key: string]: any;          // Additional custom data
  };
  timestamp: string;             // ISO 8601 timestamp
  read: boolean;                 // Read status
}
```

## Testing

### 1. Test Notification Polling
```typescript
// In your test screen
import notificationPollingService from '@core/services/NotificationPollingService';

const testPolling = async () => {
  await notificationPollingService.pollNow();
  console.log('Manual poll completed');
};
```

### 2. Test Send Notification
```typescript
import notificationsAPI from '@core/api/device.api';

const sendTestNotification = async () => {
  await notificationsAPI.sendNotification({
    user_ids: [currentUser.id],
    title: 'Test Notification',
    body: 'This is a test',
    type: 'general',
    data: { test: true }
  });
};
```

### 3. Test Quiz Notification
```typescript
const sendQuizNotification = async () => {
  await notificationsAPI.sendQuizNotification({
    user_ids: [studentId1, studentId2],
    quiz_id: 'quiz_123',
    quiz_title: 'Test Quiz',
    teacher_name: 'Test Teacher',
    session_id: 'session_456'
  });
};
```

## Performance Considerations

### Polling Intervals
- **Foreground**: 30 seconds (active engagement)
- **Background**: 60 seconds (battery conservation)
- Automatically adjusts based on app state

### Data Optimization
- Only fetches notifications since last check (using `since` timestamp)
- Backend should implement pagination for large notification lists
- Consider implementing exponential backoff on errors

### Battery & Network
- Polling uses minimal battery compared to persistent connections
- Works well with intermittent network connectivity
- Backend caching recommended for frequently accessed data

## Advantages of API-Based Approach

1. **No Native Dependencies**: Works with Expo Go (no custom dev client needed)
2. **Cross-Platform**: Same implementation for iOS and Android
3. **Simpler Setup**: No Firebase config files (google-services.json, GoogleService-Info.plist)
4. **Centralized Control**: Backend controls all notification logic
5. **Easy Testing**: Can test with simple HTTP clients (Postman, curl)
6. **No Token Management**: No need to handle FCM token registration/refresh

## Limitations

1. **Not Real-Time**: Notifications appear within 30-60 seconds (polling interval)
2. **Background Limitations**: iOS may limit background polling
3. **Network Dependent**: Requires active internet connection
4. **Battery Usage**: Slightly higher than FCM push notifications

## Migration to FCM (Optional Future Enhancement)

If you need real-time push notifications:
1. Keep backend Firebase Admin SDK implementation
2. Add FCM native modules (@react-native-firebase/messaging)
3. Use EAS build instead of Expo Go
4. Register device tokens with backend
5. Backend sends push via Firebase Admin SDK to device tokens

Files already prepared for FCM migration:
- `FCMService.ts` - Token management
- `app.json` - Firebase plugin configuration
- `eas.json` - EAS build configuration
- `google-services.json` & `GoogleService-Info.plist` - Placeholders

## Troubleshooting

### Notifications not appearing
1. Check polling status: `notificationPolling.polling` should be `true`
2. Verify user is logged in
3. Check backend API response
4. View console logs for errors

### Polling not working
1. Ensure `useNotificationPolling()` hook is called in App.tsx
2. Check app state (polling may be slower in background)
3. Verify network connectivity
4. Check backend API availability

### Navigation not working
1. Verify notification has correct `type` field
2. Check `data.quiz_id` or relevant fields are present
3. Ensure screen names match your navigation configuration
4. Review NotificationHandler.tsx navigation logic

## Summary

This API-based notification system provides a simple, reliable way to deliver notifications without complex native configuration. It works seamlessly with Expo Go and doesn't require custom dev clients or Firebase config files. The backend handles all Firebase operations using the Admin SDK, while the mobile app simply polls for new notifications via HTTP API.
