# 🚀 EduVijna Deep Linking - Your URL Pattern

## ✅ Updated Configuration

Your actual website URL pattern has been configured:

```
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c
```

## 📱 How It Works Now

### Web URL → Deep Link Mapping

**Web (What users see):**
```
https://ui.eduvijna.com/openquiz?session_id=xxx&classroom_id=yyy
```

**Mobile App Deep Link:**
```
eduvijna://openquiz?session_id=xxx&classroom_id=yyy
```

### Supported Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `session_id` | ✅ Yes | Quiz session identifier |
| `classroom_id` | ❌ Optional | Classroom/class ID |
| `quiz_id` | ❌ Optional | Specific quiz ID |

## 🧪 Testing Commands

### iOS Simulator
```bash
xcrun simctl openurl booted "eduvijna://openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c"
```

### Android Emulator/Device
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "eduvijna://openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c" \
  com.eduvijna.app
```

### Web Browser (Local)
```
http://localhost:19006/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c
```

### Web Browser (Production)
```
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c
```

## 💻 Code Examples

### Create Shareable Link

```typescript
import { buildAssessmentLink } from '@core/services/deepLinkService';

// Build quiz link
const quizUrl = buildAssessmentLink({
  sessionId: '2484e900-24d3-4d42-b65e-785751e10f2c',
  classroomId: 'class_123', // optional
  quizId: 'quiz_456',        // optional
});

// Result: https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c&classroom_id=class_123&quiz_id=quiz_456

// Share via email, SMS, notification, QR code, etc.
```

### Open in App from Web

```typescript
import { useDeepLink } from '@core/components/WebDeepLinkHandler';

const { openInApp } = useDeepLink();

// Open specific quiz in app
openInApp('2484e900-24d3-4d42-b65e-785751e10f2c', {
  classroom_id: 'class_123',
  quiz_id: 'quiz_456',
});
```

## 🔧 What Was Updated

### Configuration Files
- ✅ `app.json` - Domain changed to `ui.eduvijna.com`, path to `/openquiz`
- ✅ `App.tsx` - Route detection updated to match `/openquiz?session_id=`
- ✅ `deepLinkService.ts` - URL parsing for new pattern
- ✅ `WebDeepLinkHandler.tsx` - Web detection logic updated

### URL Pattern Changes

**Before (Generic):**
```
https://app.eduvijna.com/assessment/:assessmentId?sessionId=xxx
```

**After (Your Actual):**
```
https://ui.eduvijna.com/openquiz?session_id=xxx
```

## 🎯 User Flow Example

### Scenario: Teacher Shares Quiz

1. **Teacher creates quiz** → Gets session_id from backend
2. **Generate shareable link:**
   ```typescript
   const link = buildAssessmentLink({ 
     sessionId: '2484e900-24d3-4d42-b65e-785751e10f2c' 
   });
   ```
3. **Share link** → `https://ui.eduvijna.com/openquiz?session_id=2484e900...`
4. **Student clicks link:**
   - **Mobile with app:** Opens app directly → Quiz loads
   - **Mobile without app:** Opens web → Takes quiz online
   - **Desktop:** Opens web version → Full functionality

### Scenario: Push Notification

```json
{
  "title": "New Quiz Available",
  "body": "Math Quiz - Chapter 5",
  "data": {
    "url": "eduvijna://openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c"
  }
}
```

Student taps notification → App opens → Quiz loads instantly

## 🚀 Production Setup

### Required Files to Host

**iOS Universal Links:**
Host at: `https://ui.eduvijna.com/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.com.eduvijna.app",
      "paths": ["/openquiz"]
    }]
  }
}
```

**Android App Links:**
Host at: `https://ui.eduvijna.com/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.eduvijna.app",
    "sha256_cert_fingerprints": ["YOUR_CERT_FINGERPRINT"]
  }
}]
```

## ✅ Quick Verification

After deployment, test:

```bash
# 1. Verify files are accessible
curl https://ui.eduvijna.com/.well-known/apple-app-site-association
curl https://ui.eduvijna.com/.well-known/assetlinks.json

# 2. Test iOS universal link
# On device: Long-press link in Notes app
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c

# 3. Test Android app link
# Via Chrome browser
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c
```

## 📊 Example Session IDs

Based on your URL pattern, session IDs are UUIDs:

```
2484e900-24d3-4d42-b65e-785751e10f2c
a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7
```

Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID v4)

## 🔗 Complete Example URLs

**Minimal (session only):**
```
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c
```

**With classroom:**
```
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c&classroom_id=CS101
```

**With all parameters:**
```
https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c&classroom_id=CS101&quiz_id=quiz_789
```

## 🎓 What Happens When Link is Clicked

### Mobile (App Installed)
1. OS detects `ui.eduvijna.com/openquiz` pattern
2. Opens EduVijna app automatically
3. App extracts `session_id` from URL
4. Calls `getQuizBySessionId(sessionId)` API
5. Quiz data loaded and transformed
6. User navigated to QuizTakingScreen
7. Quiz ready to start

### Mobile (App Not Installed)
1. Link opens in browser
2. Web app loads
3. Attempts silent app launch (fails)
4. User continues with web version
5. Full functionality available on web

### Desktop
1. Link opens in browser
2. Web app detects `/openquiz` route
3. Attempts app launch (desktop has no app)
4. User continues with web experience
5. Can view/take quiz in browser

## 🐛 Troubleshooting

### Link Opens Browser Instead of App

**iOS:**
```bash
# Reset universal link associations
# Settings → Safari → Advanced → Website Data → Remove All

# Test with long-press in Notes app
```

**Android:**
```bash
# Verify domain verification status
adb shell dumpsys package domain-preferred-apps | grep eduvijna

# Should show: ui.eduvijna.com: verified
```

### Session Not Found Error

Check:
- Session ID is valid UUID format
- Session exists in backend database
- Session hasn't expired
- User has permission to access

## 📞 Support

**Test Your Implementation:**
1. Use the session ID from your example
2. Test on iOS simulator with command above
3. Test on Android emulator with command above
4. Verify quiz loads in QuizTakingScreen

**Need Help?**
- Check console logs for error messages
- Verify session_id parameter is present in URL
- Test with `getQuizBySessionId()` API directly
- Review backend API response

---

**Status:** ✅ **Updated and Ready**  
**Your Domain:** `ui.eduvijna.com`  
**Your Route:** `/openquiz`  
**Query Param:** `session_id` (required)  
**Example:** `https://ui.eduvijna.com/openquiz?session_id=2484e900-24d3-4d42-b65e-785751e10f2c`
