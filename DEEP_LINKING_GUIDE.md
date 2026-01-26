# Deep Linking Implementation Guide

## Overview
Cross-platform deep linking implementation for assessments/quizzes in EduVijna app. Users can share a single URL that works seamlessly across Web, Android, and iOS platforms.

## Canonical Route Pattern
```
/assessment/:assessmentId?sessionId=xxx&classroomId=xxx&quizId=xxx
```

### Example URLs
- **Web**: `https://app.eduvijna.com/assessment/abc123?sessionId=session_456`
- **Universal**: `eduvijna://assessment/abc123?sessionId=session_456`
- **Android**: Opens app directly or redirects to Play Store
- **iOS**: Opens app directly or redirects to App Store

## Architecture

### 1. Deep Link Configuration (`app.json`)
```json
{
  "scheme": "eduvijna",
  "intentFilters": [
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        {
          "scheme": "https",
          "host": "*.eduvijna.com",
          "pathPrefix": "/assessment"
        }
      ]
    }
  ]
}
```

**Key Features:**
- Custom URL scheme: `eduvijna://`
- Universal links: `https://*.eduvijna.com/assessment/*`
- Auto-verify for seamless Android App Links
- iOS Universal Links support

### 2. Core Services

#### **deepLinkService.ts**
Handles URL parsing and deep link detection.

**Functions:**
- `parseDeepLink(url)` - Extracts assessment data from URL
- `getInitialDeepLink()` - Gets URL that opened the app
- `subscribeToDeepLinks(handler)` - Listens for runtime deep links
- `buildAssessmentLink(params)` - Creates shareable links

**Usage:**
```typescript
import { parseDeepLink, subscribeToDeepLinks } from '@core/services/deepLinkService';

// Parse a URL
const data = parseDeepLink('eduvijna://assessment/abc123');
// Returns: { type: 'assessment', assessmentId: 'abc123', ... }

// Subscribe to deep links
const unsubscribe = subscribeToDeepLinks((data) => {
  console.log('Deep link received:', data);
});
```

#### **deepLinkNavigationHandler.ts**
Manages navigation based on deep link data and user role.

**Functions:**
- `handleAssessmentNavigation(data, role, navigation)` - Routes to correct screen
- `canAccessAssessment(role, data)` - Permission checking

**Flow:**
1. Extract assessment ID and session ID
2. Fetch quiz data using `getQuizBySessionId()`
3. Transform questions to expected format
4. Navigate to `QuizTakingScreen` with full quiz data
5. Fallback to Assessments list on error

### 3. Mobile App Integration

#### **App.tsx**
```typescript
// Deep link handling on mobile
useEffect(() => {
  if (!isMobile || !isAuthenticated) return;

  // Handle initial link
  const handleInitialLink = async () => {
    const url = await getInitialDeepLink();
    if (url) {
      const deepLinkData = parseDeepLink(url);
      setPendingDeepLink(deepLinkData);
    }
  };

  handleInitialLink();

  // Subscribe to runtime links
  const unsubscribe = subscribeToDeepLinks((data) => {
    setPendingDeepLink(data);
  });

  return unsubscribe;
}, [isMobile, isAuthenticated]);
```

**Navigation Container Linking:**
```typescript
const linking = {
  prefixes: ['eduvijna://', 'https://eduvijna.com', 'https://app.eduvijna.com'],
  config: {
    screens: {
      QuizTakingScreen: 'assessment/:assessmentId',
      // ... other screens
    },
  },
};

<NavigationContainer ref={navigationRef} linking={linking}>
  {/* ... */}
</NavigationContainer>
```

### 4. Web Integration

#### **Silent App Detection (App.tsx)**
```typescript
useEffect(() => {
  if (!isWeb) return;

  const path = window.location.pathname;
  const assessmentMatch = path.match(/\/assessment\/([^/?]+)/);
  
  if (assessmentMatch) {
    const deepLinkUrl = `eduvijna://assessment/${assessmentMatch[1]}${window.location.search}`;
    
    // Attempt silent app open
    window.location.href = deepLinkUrl;
    
    // Detect if app opened (window loses focus)
    window.addEventListener('blur', () => {
      console.log('App opened successfully');
    }, { once: true });
  }
}, [isWeb]);
```

#### **WebDeepLinkHandler Component**
Alternative approach using iframe for less disruptive experience:

```typescript
import { WebDeepLinkHandler } from '@core/components/WebDeepLinkHandler';

<WebDeepLinkHandler onAssessmentDetected={(id, params) => {
  console.log('Assessment detected:', id);
}}>
  {/* Your app content */}
</WebDeepLinkHandler>
```

## User Flows

### Flow 1: Open Assessment Link (App Installed)
1. User clicks `https://app.eduvijna.com/assessment/abc123?sessionId=xyz`
2. **iOS/Android**: OS detects universal link, opens app directly
3. App receives deep link via `getInitialDeepLink()`
4. `parseDeepLink()` extracts assessment ID and session ID
5. After authentication, `handleAssessmentNavigation()` is called
6. Quiz data fetched via `getQuizBySessionId(sessionId)`
7. User navigated to `QuizTakingScreen` with quiz loaded

### Flow 2: Open Assessment Link (App Not Installed - iOS/Android)
1. User clicks assessment link
2. OS attempts to open app, fails
3. User redirected to App Store/Play Store
4. After installation, original link preserved
5. App opens with deep link on first launch
6. Same flow as Flow 1 continues

### Flow 3: Open Assessment Link (Web)
1. User visits `https://app.eduvijna.com/assessment/abc123`
2. Web app detects `/assessment/:id` route
3. Attempts silent redirect to `eduvijna://` scheme
4. If app opens: User switched to mobile app
5. If app not installed: User continues on web
6. Web app loads assessment normally (existing functionality)

### Flow 4: Share Assessment from Mobile
```typescript
import { buildAssessmentLink } from '@core/services/deepLinkService';

const shareUrl = buildAssessmentLink({
  assessmentId: quiz.id,
  sessionId: quiz.session_id,
  classroomId: quiz.classroom_id,
});

// shareUrl: https://app.eduvijna.com/assessment/abc123?sessionId=xyz&classroomId=123
```

## Role-Based Routing

Both **Student** and **Teacher/Instructor** roles supported:

```typescript
const userRole = (user?.role === 'instructor' || user?.role === 'admin') 
  ? 'instructor' 
  : 'student';

handleAssessmentNavigation(deepLinkData, userRole, navigation);
```

**Teacher Flow:**
- Can preview assessment
- Can view student submissions
- Full edit/delete permissions

**Student Flow:**
- Takes assessment if assigned
- Views results after submission
- Read-only access

## API Integration

Uses existing backend APIs - **no modifications required**:

### `getQuizBySessionId(sessionId: string)`
```typescript
const response = await getQuizBySessionId(sessionId);

// Response format:
{
  success: true,
  quiz_data: {
    quiz_id: 123,
    topic: "Mathematics Quiz",
    duration: 1800,
    has_time_limit: true,
    questions: {
      quizzes: [
        {
          quiz: {
            question: "What is 2+2?",
            options: ["3", "4", "5", "6"],
            answer: "B"
          }
        }
      ]
    }
  }
}
```

### Question Transformation
```typescript
const transformedQuestions = quizData.questions.quizzes.map((q, index) => ({
  id: (index + 1).toString(),
  question: q.quiz.question,
  options: q.quiz.options,
  correctAnswer: q.quiz.answer,
  explanation: q.explanation || null,
}));
```

## Testing

### Test Deep Links

#### iOS Simulator
```bash
xcrun simctl openurl booted "eduvijna://assessment/test123?sessionId=abc"
```

#### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "eduvijna://assessment/test123?sessionId=abc" com.eduvijna.app
```

#### Web (Local Development)
```
http://localhost:19006/assessment/test123?sessionId=abc
```

### Verification Checklist

- [ ] Deep link opens app from notification
- [ ] Deep link opens app from web browser
- [ ] Deep link opens app from messaging apps (WhatsApp, Slack, etc.)
- [ ] Assessment loads correctly for students
- [ ] Assessment loads correctly for teachers
- [ ] Fallback to web works when app not installed
- [ ] Navigation history preserved (back button works)
- [ ] No regressions in existing assessment flow
- [ ] Role-based permissions enforced
- [ ] Error handling for invalid/expired links

## Platform-Specific Configuration

### iOS (Universal Links)

**Required File**: `apple-app-site-association` (hosted at `https://eduvijna.com/.well-known/`)

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.eduvijna.app",
        "paths": ["/assessment/*"]
      }
    ]
  }
}
```

**Capabilities Required:**
- Associated Domains: `applinks:eduvijna.com`

### Android (App Links)

**app.json already configured** with:
```json
{
  "intentFilters": [{
    "autoVerify": true,
    "data": [{
      "scheme": "https",
      "host": "*.eduvijna.com"
    }]
  }]
}
```

**Required File**: `assetlinks.json` (hosted at `https://eduvijna.com/.well-known/`)

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.eduvijna.app",
    "sha256_cert_fingerprints": ["CERT_FINGERPRINT"]
  }
}]
```

## Security Considerations

1. **Authentication Required**: All assessment routes require user authentication
2. **Session Validation**: Session IDs validated server-side
3. **Role Verification**: User role checked before granting access
4. **Expired Links**: Backend handles invalid/expired session IDs gracefully
5. **No Sensitive Data in URLs**: Only IDs passed, data fetched server-side

## Troubleshooting

### Deep Link Not Opening App

**iOS:**
- Verify associated domains in Xcode
- Check `apple-app-site-association` file is accessible
- Clear Safari cache and try again
- Test with simulator: `xcrun simctl openurl booted "eduvijna://..."`

**Android:**
- Verify `assetlinks.json` is accessible
- Check package name matches exactly
- Test with adb: `adb shell am start -W -a android.intent.action.VIEW -d "eduvijna://..."`
- Clear default app associations in Android settings

### Assessment Not Loading

**Check:**
1. Session ID is valid and not expired
2. User has permission to access assessment
3. Backend API is responding correctly
4. Network connectivity
5. Console logs for error messages

**Debug Commands:**
```typescript
console.log('Deep link data:', deepLinkData);
console.log('User role:', userRole);
console.log('API response:', quizData);
```

### Web Redirect Not Working

- Check browser console for errors
- Verify URL pattern matches `/assessment/:id`
- Test in different browsers (Chrome, Safari, Firefox)
- Check if popup blocker is interfering

## Future Enhancements

1. **QR Code Generation**: Generate QR codes for assessments
2. **Dynamic Links**: Firebase Dynamic Links for advanced features
3. **Analytics**: Track deep link usage and conversion rates
4. **Smart Banners**: Show app install banner on web
5. **Deferred Deep Linking**: Preserve link through app install flow
6. **Branch/Adjust Integration**: Advanced attribution tracking

## Files Modified

### Created:
- `src/core/services/deepLinkService.ts` - Core deep link parsing and URL handling
- `src/core/services/deepLinkNavigationHandler.ts` - Navigation logic based on deep links
- `src/core/components/WebDeepLinkHandler.tsx` - Web-specific deep link component

### Modified:
- `app.json` - Added deep linking configuration (scheme, intentFilters)
- `App.tsx` - Integrated deep link handlers for mobile and web
- `src/platforms/mobile/navigation/BottomTabNavigator.tsx` - Added Assessments to stack

### No Changes Required:
- Backend APIs
- Assessment creation screens
- Dashboard components
- Analytics screens
- Existing navigation flows

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify deep link format matches documentation
3. Test with different platforms (iOS, Android, Web)
4. Review backend API responses
5. Contact development team with specific error logs
