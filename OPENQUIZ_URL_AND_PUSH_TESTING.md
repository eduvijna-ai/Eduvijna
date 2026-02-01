# OpenQuiz URL & Push Notification Testing Guide

## 🎯 Two Ways to Share Quizzes

### 1️⃣ Web URL (WhatsApp/SMS/Email)
**Format:**
```
https://ui.eduvijna.com/openquiz?session_id=YOUR_SESSION_ID
```

**Example:**
```
https://ui.eduvijna.com/openquiz?session_id=0e25f159-157a-4cda-9b8f-94d93f6ff48c
```

**How it Works:**
1. Teacher shares URL via WhatsApp/SMS/Email
2. Student taps link on their phone
3. If app is installed → Opens app directly (after App Links setup)
4. If app is not installed → Opens in browser
5. App validates quiz and shows appropriate screen

### 2️⃣ Push Notification
**Sent via Backend API:**
```
POST /api/notifications/send-quiz-notification
```

**Payload:**
```json
{
  "student_ids": ["12", "34"],
  "title": "📚 New Quiz: Fractions",
  "body": "Mr. Smith assigned a new quiz. Tap to start!",
  "data": {
    "type": "QUIZ_ASSIGNED",
    "quizId": "123",
    "sessionId": "0e25f159-157a-4cda-9b8f-94d93f6ff48c",
    "quizTitle": "Fractions",
    "teacherName": "Mr. Smith"
  }
}
```

**How it Works:**
1. Teacher creates/shares quiz in app
2. Backend sends push notification to students
3. Student receives notification
4. Student taps notification
5. App opens and validates quiz

---

## ✅ Current Status

### Web URL Support
✅ **Deep link parsing** - Extracts `session_id` from URL  
✅ **Both formats supported:**
  - `eduvijna://openquiz?session_id=xxx`
  - `https://ui.eduvijna.com/openquiz?session_id=xxx`  
✅ **Web redirect** - If opened in browser, tries to open app  
⚠️ **App Links** - Needs `assetlinks.json` on server for auto-open

### Push Notification Support
✅ **Backend endpoint** - `/api/notifications/send-quiz-notification`  
✅ **Payload structure** - Includes `sessionId` in data field  
✅ **Notification handler** - Extracts `sessionId` correctly  
✅ **Unified flow** - Both methods use same `handleOpenQuiz` function

---

## 🧪 Testing Scenarios

### Test 1: WhatsApp URL → App Installed
1. Create quiz and get session ID
2. Share URL: `https://ui.eduvijna.com/openquiz?session_id=xxx`
3. Send to yourself on WhatsApp
4. Tap link
5. **Expected:** App opens and validates quiz

### Test 2: WhatsApp URL → App Not Installed
1. Share URL on device without app
2. Tap link
3. **Expected:** Opens in browser (can show "Install App" message)

### Test 3: Push Notification → Student Enrolled
1. Teacher creates quiz for classroom
2. Student receives push notification
3. Student taps notification
4. **Expected:** App opens to QuizTakingScreen

### Test 4: Push Notification → Quiz Expired
1. Send notification for expired quiz
2. Student taps notification
3. **Expected:** Shows "Quiz Expired" status screen

### Test 5: URL → Quiz Not Assigned
1. Share URL of quiz not assigned to student
2. Student taps URL
3. **Expected:** Shows "Quiz Not Assigned" status screen

---

## 🔧 Implementation Details

### URL Parsing
```typescript
// From: https://ui.eduvijna.com/openquiz?session_id=abc123
const sessionId = urlObj.searchParams.get('session_id'); // "abc123"
```

### Notification Parsing
```typescript
// From notification data
const sessionId = data?.sessionId || data?.session_id;
```

### Unified Handler
```typescript
// Both URL and notification use same handler
await handleOpenQuiz(sessionId, source, user, navigationAdapter);
```

### Validation Flow
```
1. Show loading screen
2. Fetch quiz with session_id
3. Check: exists, expired, scheduled, assigned, attempted
4. Navigate based on validation results:
   - Student not assigned → Status screen
   - Quiz expired → Status screen
   - Quiz scheduled → Status screen with start/end times
   - Already attempted → QuizResultsScreen
   - Available → QuizTakingScreen
   - Teacher → QuizPreviewScreen
```

---

## 📝 Setup Checklist

### For Web URLs to Auto-Open App
- [x] Configure `intentFilters` in app.json
- [x] Set `autoVerify: true`
- [ ] Get SHA256 fingerprints (debug + release)
- [ ] Create `assetlinks.json` file
- [ ] Upload to `https://ui.eduvijna.com/.well-known/assetlinks.json`
- [ ] Test with WhatsApp/browser

### For Push Notifications
- [x] Backend endpoint configured
- [x] Frontend sends correct payload
- [x] App handles notification data
- [x] Extracts sessionId properly
- [x] Uses unified validation flow

---

## 🐛 Troubleshooting

### URL doesn't open app
**Issue:** Clicking URL opens browser instead of app  
**Solution:** 
1. Complete App Links setup (assetlinks.json)
2. Reinstall app after setup
3. Wait up to 24 hours for Google verification

### Notification has no sessionId
**Issue:** `❌ No sessionId found in notification data`  
**Solution:**
1. Check backend sends correct payload format
2. Verify `data.sessionId` field exists
3. Check [ShareQuizModal.tsx](g:\Eduvijna\src\components\ShareQuizModal.tsx) payload

### Quiz validation fails
**Issue:** Shows "Quiz Not Available" for valid quiz  
**Solution:**
1. Check session_id is correct
2. Verify quiz exists in database
3. Check user authentication
4. Review backend API response

---

## 🚀 Next Steps

1. **Get SHA256 Fingerprints**
   ```bash
   cd android
   ./gradlew signingReport
   ```

2. **Update assetlinks.json**
   - Replace placeholder fingerprints
   - Add both debug and release fingerprints

3. **Deploy to Web Server**
   ```bash
   # Upload to: https://ui.eduvijna.com/.well-known/assetlinks.json
   ```

4. **Test Complete Flow**
   - Create quiz
   - Share via WhatsApp
   - Send push notification
   - Verify both methods work

5. **Monitor Logs**
   ```bash
   # Watch for deep link handling
   npx expo run:android
   
   # Check for errors
   adb logcat | grep -i "eduvijna\|openquiz\|sessionId"
   ```
