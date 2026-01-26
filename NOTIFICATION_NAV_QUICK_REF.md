# Notification Click Navigation - Quick Reference

## ✅ What's Implemented

When users tap/click notifications, they navigate to the relevant quiz:
- **Mobile Push Notifications** → Opens app and navigates to quiz
- **In-App Dropdown Clicks** → Navigates within app
- **Test Notifications** → Includes navigation data for testing

---

## 📱 How to Test (Mobile)

### Quick Test
1. Profile → "🔬 Test Push Notifications"
2. Tap "Send Test Notification"
3. Tap the notification that appears
4. See alert → Tap "View Quiz"
5. ✅ Navigates to QuizPreviewScreen

### Test Different States
- **App Open**: Tap notification → immediate navigation
- **App Background**: Tap notification → app opens → navigates
- **App Closed**: Tap notification → app opens → navigates

---

## 🔔 Notification Data Format

### Minimal (for testing)
```json
{
  "title": "New Quiz",
  "body": "Tap to view",
  "data": {
    "type": "quiz_assigned",
    "quiz_id": "123"
  }
}
```

### Complete (production)
```json
{
  "title": "New Quiz Available",
  "body": "Mathematics Quiz - Chapter 5",
  "data": {
    "type": "quiz_assigned",
    "quiz_id": "quiz-123",
    "quiz_title": "Mathematics Quiz - Chapter 5",
    "classroom_id": "class-101",
    "classroom_name": "Grade 10 Math"
  }
}
```

---

## 🎯 Navigation Mapping

| Notification Type | Navigates To | Required Data |
|------------------|--------------|---------------|
| `quiz_assigned` | QuizPreviewScreen | `quiz_id` |
| `quiz_graded` | QuizResultsScreen | `quiz_id`, `student_id` |
| `classroom_invite` | ClassesList | - |
| `announcement` | Notifications | - |
| `general` | QuizPreviewScreen or Notifications | `quiz_id` (optional) |

---

## 🛠️ Backend Integration

### Send notification with navigation
```javascript
// When assigning a quiz
await sendNotification({
  user_id: studentId,
  type: 'quiz_assigned',
  title: 'New Quiz Available',
  message: quizTitle,
  data: {
    quiz_id: quizId,
    quiz_title: quizTitle,
    classroom_id: classroomId,
  }
});
```

### Using Expo Push API
```bash
POST https://exp.host/--/api/v2/push/send
{
  "to": "<DEVICE_TOKEN>",
  "title": "New Quiz Available",
  "body": "Tap to view",
  "data": {
    "type": "quiz_assigned",
    "quiz_id": "123",
    "quiz_title": "Math Quiz"
  }
}
```

---

## 🐛 Troubleshooting

### Notification doesn't navigate
- ✅ Check `data.type` is set
- ✅ Check `data.quiz_id` for quiz navigation
- ✅ Look for "🔔 Notification tapped" in console

### Wrong screen opens
- ✅ Verify `data.type` matches expected value
- ✅ Check console for "➡️ Navigating to..." log
- ✅ Ensure screen names are exact match

---

## 📁 Modified Files

**New**:
- `src/components/NotificationHandler.tsx` - Global tap handler

**Updated**:
- `src/screens/TestNotifications.tsx` - Added navigation test
- `src/platforms/web/navigation/WebNavigation.tsx` - Enhanced clicks
- `src/platforms/mobile/navigation/BottomTabNavigator.tsx` - Added handler

---

## 📚 Full Documentation

See [NOTIFICATION_NAVIGATION_GUIDE.md](NOTIFICATION_NAVIGATION_GUIDE.md) for complete details.
