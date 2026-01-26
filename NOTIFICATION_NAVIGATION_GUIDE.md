# Notification Click Handling - Implementation Guide

## Overview
Users can now tap/click on notifications to navigate directly to the related quiz or content. This works for:
- **Local test notifications** (TestNotifications screen)
- **Backend push notifications** (from server)
- **In-app notifications** (NotificationsDropdown)

---

## Features Implemented

### 1. **Mobile Notification Tap Handling** ✅
When a user taps a push notification on mobile:
- App opens and navigates to the relevant quiz/screen
- Works when app is closed, backgrounded, or open
- Automatically marks notification as read

### 2. **In-App Notification Clicks** ✅
When a user clicks a notification in the NotificationsDropdown:
- Navigates to the appropriate screen based on notification type
- Marks notification as read
- Closes the dropdown

### 3. **Test Notification Navigation** ✅
TestNotifications screen sends notifications with quiz data for testing navigation

---

## Navigation Logic

### Mobile (React Navigation)
```typescript
// Based on notification type:
quiz_assigned     → QuizPreviewScreen (view quiz details)
quiz_graded       → QuizResultsScreen (view results)
classroom_invite  → ClassesList (view classes)
announcement      → Notifications (view all notifications)
general          → QuizPreviewScreen (if has quiz_id) or Notifications
```

### Web (Screen Navigation)
```typescript
// Based on notification type:
quiz_assigned     → assessments screen
quiz_graded       → assessments screen
classroom_invite  → classes screen
announcement      → notifications screen
general          → assessments (if has quiz_id) or dashboard
```

---

## Notification Data Structure

### Required Fields for Navigation
```typescript
{
  type: 'quiz_assigned' | 'quiz_graded' | 'classroom_invite' | 'announcement' | 'general',
  data: {
    quiz_id?: string,          // Required for quiz-related navigation
    quiz_title?: string,       // Display in navigation confirmation
    classroom_id?: string,     // For classroom notifications
    classroom_name?: string,   // Display name
    assignment_id?: string,    // For assignment-specific navigation
    student_id?: string,       // For quiz results (graded notifications)
  }
}
```

### Example: Quiz Assignment Notification
```typescript
{
  title: "New Quiz Available",
  body: "Mathematics Quiz - Chapter 5 is ready",
  data: {
    type: 'quiz_assigned',
    quiz_id: 'quiz-123',
    quiz_title: 'Mathematics Quiz - Chapter 5',
    classroom_id: 'class-101',
    classroom_name: 'Grade 10 Math'
  }
}
```

### Example: Quiz Graded Notification
```typescript
{
  title: "Quiz Graded",
  body: "Your Math quiz has been graded - 85%",
  data: {
    type: 'quiz_graded',
    quiz_id: 'quiz-123',
    quiz_title: 'Mathematics Quiz - Chapter 5',
    student_id: 'student-456',
    score: 85
  }
}
```

---

## Components Modified

### 1. NotificationHandler.tsx (NEW)
**Location**: `src/components/NotificationHandler.tsx`

Global component that listens for notification taps and handles navigation.

**Key Functions**:
- `addNotificationResponseReceivedListener` - Handles taps when app is running
- `getLastNotificationResponseAsync` - Handles tap that opened the app
- `handleNotificationTap` - Parses data and navigates

**Usage**: Automatically included in BottomTabNavigator

### 2. TestNotifications.tsx (UPDATED)
**Location**: `src/screens/TestNotifications.tsx`

**Changes**:
- ✅ Added notification response listener
- ✅ Added `handleNotificationTap` function
- ✅ Updated test notification to include quiz data
- ✅ Shows navigation confirmation alert

**Test Flow**:
1. Open TestNotifications screen
2. Tap "Send Test Notification"
3. See notification appear
4. Tap notification
5. See navigation confirmation dialog
6. Choose "View Quiz" to navigate

### 3. WebNavigation.tsx (UPDATED)
**Location**: `src/platforms/web/navigation/WebNavigation.tsx`

**Changes**:
- ✅ Enhanced `handleNotificationClick` with full navigation logic
- ✅ Handles all notification types (quiz_assigned, quiz_graded, etc.)
- ✅ Navigates to appropriate web screens

### 4. BottomTabNavigator.tsx (UPDATED)
**Location**: `src/platforms/mobile/navigation/BottomTabNavigator.tsx`

**Changes**:
- ✅ Added `NotificationHandler` import
- ✅ Included `<NotificationHandler />` in navigation tree

---

## Testing Guide

### Test Local Notifications (Mobile)

1. **Open Test Screen**:
   ```
   Profile → "🔬 Test Push Notifications"
   ```

2. **Send Test Notification**:
   - Tap "Send Test Notification" button
   - Notification appears with: "🎉 New Quiz Available"

3. **Test Navigation**:
   - Tap the notification
   - See alert: "Navigate to Quiz - Mathematics Quiz - Chapter 5"
   - Tap "View Quiz" button
   - App navigates to QuizPreviewScreen

4. **Test Different States**:
   - **App Open**: Notification appears, tap navigates immediately
   - **App Background**: Notification appears, tap opens app and navigates
   - **App Closed**: Notification appears, tap opens app and navigates

### Test Backend Notifications (Mobile)

1. **Get Device Token**:
   - Open TestNotifications screen
   - Copy device token to clipboard

2. **Backend Sends Notification**:
   ```bash
   POST https://exp.host/--/api/v2/push/send
   {
     "to": "<DEVICE_TOKEN>",
     "title": "New Quiz Available",
     "body": "Tap to view your quiz",
     "data": {
       "type": "quiz_assigned",
       "quiz_id": "123",
       "quiz_title": "Math Quiz"
     }
   }
   ```

3. **Test Navigation**:
   - Receive notification on device
   - Tap notification
   - App navigates to quiz

### Test In-App Dropdown (Web & Mobile)

1. **Open Notifications**:
   - Click notification bell icon in header
   - Dropdown opens with notification list

2. **Click Notification**:
   - Click any notification in the list
   - Notification marked as read
   - Dropdown closes
   - App navigates to appropriate screen

---

## Backend Integration

### Sending Notifications with Navigation Data

When creating a quiz assignment:
```typescript
// Backend API call
POST /api/v1/notifications/send
{
  "user_id": "<student_id>",
  "type": "quiz_assigned",
  "title": "New Quiz Available",
  "message": "Mathematics Quiz - Chapter 5 is ready",
  "data": {
    "quiz_id": "quiz-123",
    "quiz_title": "Mathematics Quiz - Chapter 5",
    "classroom_id": "class-101",
    "classroom_name": "Grade 10 Math",
    "due_date": "2026-02-01T23:59:59Z"
  }
}
```

When a quiz is graded:
```typescript
POST /api/v1/notifications/send
{
  "user_id": "<student_id>",
  "type": "quiz_graded",
  "title": "Quiz Graded",
  "message": "Your Math quiz has been graded - 85%",
  "data": {
    "quiz_id": "quiz-123",
    "quiz_title": "Mathematics Quiz - Chapter 5",
    "student_id": "<student_id>",
    "score": 85,
    "total_score": 100,
    "percentage": 85
  }
}
```

---

## Console Logs

### Successful Navigation
```
🔔 Notification tapped: {...}
📱 Notification data: { type: 'quiz_assigned', quiz_id: 'test-quiz-123', ... }
➡️ Navigating to QuizPreviewScreen: test-quiz-123
```

### App Opened from Notification
```
🔔 App opened from notification: {...}
📱 Handling notification: { title: 'New Quiz Available', data: {...} }
➡️ Navigating to QuizPreviewScreen: quiz-123
```

---

## Troubleshooting

### Issue: Notification doesn't navigate
**Check**:
- ✅ Notification has `data.type` field
- ✅ For quiz navigation, has `data.quiz_id`
- ✅ NotificationHandler is included in navigation tree
- ✅ Console shows "🔔 Notification tapped" log

### Issue: Wrong screen opened
**Check**:
- ✅ `data.type` matches expected value ('quiz_assigned', 'quiz_graded', etc.)
- ✅ Screen names match exactly (case-sensitive)
- ✅ Console shows "➡️ Navigating to..." log

### Issue: App crashes on navigation
**Check**:
- ✅ Target screen is registered in Stack.Navigator
- ✅ Navigation params match screen's expected props
- ✅ Check error logs in console

---

## Future Enhancements

### Planned Features
- [ ] Deep linking support for sharing quiz URLs
- [ ] Web URL parameters for quiz navigation
- [ ] Navigate to specific question in quiz
- [ ] Navigate to classroom chat/discussion
- [ ] Rich notification actions (Reply, Dismiss, etc.)
- [ ] Notification grouping by type
- [ ] Custom notification sounds per type

### Navigation Improvements
- [ ] Pass quiz data in navigation params (avoid extra API call)
- [ ] Navigate to specific tab in QuizPreviewScreen
- [ ] Show loading state while navigating
- [ ] Cache last notification for offline handling

---

## Files Modified

### New Files
1. `src/components/NotificationHandler.tsx` - Global notification tap handler

### Updated Files
1. `src/screens/TestNotifications.tsx` - Added navigation testing
2. `src/platforms/web/navigation/WebNavigation.tsx` - Enhanced click handling
3. `src/platforms/mobile/navigation/BottomTabNavigator.tsx` - Added NotificationHandler

### Unchanged (Already Working)
1. `src/components/NotificationsDropdown.tsx` - Already had click callback
2. `src/core/hooks/useNotifications.ts` - No changes needed
3. `src/core/api/notifications.api.ts` - Notification interface supports data field

---

## Related Documentation
- [PUSH_NOTIFICATIONS_COMPLETE.md](PUSH_NOTIFICATIONS_COMPLETE.md) - Full notification system
- [NOTIFICATIONS_QUICK_REF.md](NOTIFICATIONS_QUICK_REF.md) - Quick reference
- [MOBILE_NOTIFICATION_TESTING.md](MOBILE_NOTIFICATION_TESTING.md) - Testing guide
