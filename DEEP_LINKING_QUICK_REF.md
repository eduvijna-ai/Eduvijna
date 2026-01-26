# Deep Linking Quick Reference

## URL Format
```
https://app.eduvijna.com/assessment/:assessmentId?sessionId=xxx&classroomId=xxx&quizId=xxx
```

## Share an Assessment

### From Code
```typescript
import { buildAssessmentLink } from '@core/services/deepLinkService';

const url = buildAssessmentLink({
  assessmentId: quiz.id,
  sessionId: quiz.session_id,
  classroomId: quiz.classroom_id,
  quizId: quiz.quiz_id, // optional
});

// Use url for sharing via email, SMS, or social media
```

### From UI
Use existing share functionality - it automatically generates the correct deep link.

## Test Deep Links

### iOS Simulator
```bash
xcrun simctl openurl booted "eduvijna://assessment/abc123?sessionId=xyz"
```

### Android Emulator/Device
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "eduvijna://assessment/abc123?sessionId=xyz" com.eduvijna.app
```

### Web Browser
```
http://localhost:19006/assessment/abc123?sessionId=xyz
```

## How It Works

### Mobile
1. User clicks assessment link
2. OS opens app automatically (if installed)
3. App fetches quiz data from backend
4. User navigated to QuizTakingScreen
5. Quiz loads with all questions ready

### Web
1. User visits assessment URL
2. Web app tries to open mobile app silently
3. If successful: Switches to app
4. If app not installed: Continues on web
5. Web experience unchanged (existing functionality)

## Key Files

| File | Purpose |
|------|---------|
| `app.json` | Deep linking config (schemes, domains) |
| `deepLinkService.ts` | Parse URLs, build links |
| `deepLinkNavigationHandler.ts` | Navigate based on deep link |
| `App.tsx` | Integrate deep linking in app |
| `WebDeepLinkHandler.tsx` | Web-specific handling |

## Common Issues

### Link Not Opening App

**iOS:**
```bash
# Test in simulator
xcrun simctl openurl booted "eduvijna://assessment/test"

# Verify universal link works
xcrun simctl openurl booted "https://app.eduvijna.com/assessment/test"
```

**Android:**
```bash
# Test custom scheme
adb shell am start -a android.intent.action.VIEW -d "eduvijna://assessment/test"

# Test https link
adb shell am start -a android.intent.action.VIEW -d "https://app.eduvijna.com/assessment/test"
```

### Assessment Not Loading

Check:
- [ ] Session ID is valid
- [ ] User is authenticated
- [ ] Backend API is reachable
- [ ] Console for error messages

### Web Redirect Not Working

Check:
- [ ] Browser console for errors
- [ ] URL matches `/assessment/:id` pattern
- [ ] Popup blocker settings
- [ ] Test in different browsers

## API Reference

### parseDeepLink(url)
```typescript
const data = parseDeepLink('eduvijna://assessment/abc?sessionId=xyz');
// Returns: { type: 'assessment', assessmentId: 'abc', sessionId: 'xyz' }
```

### buildAssessmentLink(params)
```typescript
const url = buildAssessmentLink({ 
  assessmentId: '123',
  sessionId: 'session_456' 
});
// Returns: 'https://app.eduvijna.com/assessment/123?sessionId=session_456'
```

### handleAssessmentNavigation(data, role, navigation)
```typescript
await handleAssessmentNavigation(
  { type: 'assessment', assessmentId: '123', sessionId: 'xyz' },
  'student',
  navigation
);
// Fetches quiz and navigates to QuizTakingScreen
```

## Production Deployment

### Required Setup

1. **iOS - Associated Domains**
   - Add to Xcode: `applinks:eduvijna.com`
   - Host file at: `https://eduvijna.com/.well-known/apple-app-site-association`

2. **Android - App Links**
   - Already configured in `app.json`
   - Host file at: `https://eduvijna.com/.well-known/assetlinks.json`

3. **Web - DNS/Hosting**
   - Ensure `/assessment/*` routes handled correctly
   - Set up proper redirects if needed

### Verification

**iOS:**
```bash
# Verify associated domain file
curl https://eduvijna.com/.well-known/apple-app-site-association

# Should return valid JSON with applinks configuration
```

**Android:**
```bash
# Verify asset links file
curl https://eduvijna.com/.well-known/assetlinks.json

# Should return valid JSON with app package info
```

**Web:**
```bash
# Test route accessibility
curl https://app.eduvijna.com/assessment/test

# Should return 200 OK
```

## Support Checklist

Before reporting issues, verify:

- [ ] Deep link format is correct
- [ ] User is logged in
- [ ] Session ID is valid (not expired)
- [ ] App has latest version
- [ ] Tested on actual device (not just simulator)
- [ ] Checked console logs for errors
- [ ] Backend API is responding
- [ ] Network connection is stable

## Examples

### Example 1: Share Quiz to Student
```typescript
const quizLink = buildAssessmentLink({
  assessmentId: quiz.id,
  sessionId: quiz.session_id,
  classroomId: quiz.classroom_id,
});

// Send via email, SMS, or notification
// Student clicks link → App opens → Quiz loads automatically
```

### Example 2: Open Quiz from Notification
```typescript
// In notification payload
{
  title: "New Quiz Available",
  body: "Math Quiz - Chapter 5",
  data: {
    url: "eduvijna://assessment/abc123?sessionId=xyz789"
  }
}

// User taps notification → handleNotificationResponse() parses URL
// → App navigates to QuizTakingScreen with quiz loaded
```

### Example 3: QR Code for In-Person Quiz
```typescript
const quizUrl = buildAssessmentLink({
  assessmentId: 'classroom_quiz_123',
  sessionId: 'live_session_456',
});

// Generate QR code from quizUrl
// Students scan → App opens → Join live quiz session
```

## Performance Notes

- Deep link parsing: < 10ms
- Quiz data fetch: Depends on backend response time
- Navigation: Instant once data available
- No impact on app startup time
- Web redirect attempt: Non-blocking, < 1s timeout

## Best Practices

1. **Always include session ID** for direct quiz loading
2. **Use HTTPS URLs** for sharing (better compatibility)
3. **Test on real devices** before production release
4. **Monitor analytics** to track deep link usage
5. **Handle errors gracefully** with fallback navigation
6. **Keep URLs short** for better user experience
7. **Include user role context** when possible

## Version Compatibility

- **Minimum React Native**: 0.70+
- **Minimum React Navigation**: 6.0+
- **Minimum Expo**: 49+
- **iOS**: 13.0+
- **Android**: 6.0+ (API 23+)
- **Web**: Modern browsers (Chrome, Safari, Firefox, Edge)

## Additional Resources

- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking)
- [Expo Linking Guide](https://docs.expo.dev/guides/linking/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
