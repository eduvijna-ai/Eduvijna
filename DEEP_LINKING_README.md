# 🔗 Deep Linking - Quick Start

## What is This?

Deep linking allows users to open specific assessments in your app using a single URL that works across **Web**, **iOS**, and **Android** platforms.

**Example:**
```
https://app.eduvijna.com/assessment/abc123?sessionId=xyz789
```

This link:
- ✅ Opens the app directly (if installed)
- ✅ Falls back to web version (if app not installed)
- ✅ Works from email, SMS, notifications, QR codes
- ✅ Automatically loads the correct assessment
- ✅ Works for both Students and Teachers

## 🚀 Getting Started

### For Developers

1. **Read the comprehensive guide:**
   ```
   DEEP_LINKING_GUIDE.md
   ```

2. **Quick reference for common tasks:**
   ```
   DEEP_LINKING_QUICK_REF.md
   ```

3. **Platform-specific setup (iOS/Android):**
   ```
   DEEP_LINKING_PLATFORM_SETUP.md
   ```

4. **Implementation summary:**
   ```
   DEEP_LINKING_IMPLEMENTATION_SUMMARY.md
   ```

### For Product/QA Teams

Start with `DEEP_LINKING_IMPLEMENTATION_SUMMARY.md` for an overview, then check the quick reference for testing procedures.

## 📱 How to Use

### Share an Assessment

```typescript
import { buildAssessmentLink } from '@core/services/deepLinkService';

const url = buildAssessmentLink({
  assessmentId: quiz.id,
  sessionId: quiz.session_id,
  classroomId: quiz.classroom_id,
});

// Share this URL via email, SMS, notification, etc.
```

### Test Deep Links

**iOS Simulator:**
```bash
xcrun simctl openurl booted "eduvijna://assessment/test123?sessionId=xyz"
```

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "eduvijna://assessment/test123?sessionId=xyz" com.eduvijna.app
```

**Web:**
```
http://localhost:19006/assessment/test123?sessionId=xyz
```

## 📂 File Structure

```
Deep Linking Implementation
├── app.json                              # Deep link configuration
├── App.tsx                               # Main app integration
├── src/
│   ├── core/
│   │   ├── services/
│   │   │   ├── deepLinkService.ts        # URL parsing & link building
│   │   │   └── deepLinkNavigationHandler.ts  # Navigation logic
│   │   └── components/
│   │       └── WebDeepLinkHandler.tsx    # Web-specific handling
│   └── platforms/
│       └── mobile/
│           └── navigation/
│               └── BottomTabNavigator.tsx # Mobile navigation
└── Documentation/
    ├── DEEP_LINKING_GUIDE.md             # Complete guide (read this first!)
    ├── DEEP_LINKING_QUICK_REF.md         # Quick reference
    ├── DEEP_LINKING_PLATFORM_SETUP.md    # iOS/Android setup
    └── DEEP_LINKING_IMPLEMENTATION_SUMMARY.md  # Overview
```

## ✅ What Works Now

- ✅ **Web-to-App Handoff**: Click link on web → Opens in app
- ✅ **Notification Deep Links**: Tap notification → Opens specific assessment
- ✅ **Shareable Links**: Single URL works everywhere
- ✅ **QR Codes**: Generate and scan to open assessments
- ✅ **Role-Based Routing**: Correct view for Students vs Teachers
- ✅ **Fallback Handling**: Gracefully handles app not installed
- ✅ **Zero Regressions**: All existing features still work

## 🔧 Production Setup Required

Before releasing to production, you need to:

1. **iOS**: Host `apple-app-site-association` file
2. **Android**: Host `assetlinks.json` file
3. **Both**: Configure domain verification

See `DEEP_LINKING_PLATFORM_SETUP.md` for detailed instructions.

**Estimated Setup Time**: 30 minutes

## 🎯 Use Cases

### 1. **Teacher Shares Quiz**
Teacher creates quiz → Gets shareable link → Sends to students → Students click → App opens with quiz loaded

### 2. **Push Notification**
New quiz assigned → Notification sent → Student taps → App opens directly to quiz

### 3. **In-Class QR Code**
Teacher displays QR code → Students scan → App opens with quiz → Everyone starts together

### 4. **Email/LMS Integration**
Teacher embeds link in email or LMS → Students click from any device → Correct quiz opens

### 5. **Web Discovery**
Student finds quiz link on web → Clicks → App opens if installed, otherwise continues on web

## 📊 Key Metrics to Track

Once deployed, monitor:
- Deep link click-through rate
- App open rate vs web fallback
- Assessment completion rate from deep links
- Platform distribution (iOS vs Android vs Web)
- Time from link click to quiz start

## ⚠️ Known Limitations

1. **Universal links require HTTPS** - Won't work on localhost in production mode
2. **First install delay** - May take a few seconds for OS to verify domains
3. **Browser behavior** - Some browsers handle deep links differently
4. **Testing on simulator** - Use adb/xcrun commands, not just clicking links

## 🆘 Troubleshooting

### Link Not Opening App

1. Check if app is installed
2. Verify domain verification files are hosted
3. Clear browser/app cache
4. Test with provided commands
5. Check console logs for errors

### Assessment Not Loading

1. Verify session ID is valid
2. Check user authentication
3. Confirm network connectivity
4. Review backend API response
5. Check role permissions

## 📞 Getting Help

1. **First**: Check `DEEP_LINKING_QUICK_REF.md`
2. **Detailed Info**: Read `DEEP_LINKING_GUIDE.md`
3. **Setup Issues**: See `DEEP_LINKING_PLATFORM_SETUP.md`
4. **Still Stuck**: Contact development team with:
   - Deep link URL you're testing
   - Platform (iOS/Android/Web)
   - Console error messages
   - Steps to reproduce

## 🎓 Learning Path

**For New Developers:**
1. Read this README (5 min)
2. Skim `DEEP_LINKING_IMPLEMENTATION_SUMMARY.md` (10 min)
3. Read `DEEP_LINKING_GUIDE.md` sections as needed (30 min)
4. Test with provided commands (15 min)
5. Review code with inline comments (20 min)

**For Product Managers:**
1. Read `DEEP_LINKING_IMPLEMENTATION_SUMMARY.md`
2. Check "Use Cases" section above
3. Review "Key Metrics to Track"

**For QA Engineers:**
1. Read `DEEP_LINKING_QUICK_REF.md`
2. Follow testing procedures
3. Use verification checklist

## 🚀 Next Steps

### Immediate (Required for Production)
- [ ] Host iOS verification file
- [ ] Host Android verification file
- [ ] Test on real devices
- [ ] Update app store listings

### Short Term (Recommended)
- [ ] Set up analytics tracking
- [ ] Create QR code generator UI
- [ ] Add deep link usage monitoring
- [ ] Train support team

### Future Enhancements (Optional)
- [ ] Firebase Dynamic Links integration
- [ ] Advanced attribution tracking
- [ ] Smart banners on web
- [ ] Deep link preview cards

## 📈 Success Metrics

Implementation is considered successful when:
- ✅ 90%+ deep links open app correctly
- ✅ < 5% error rate on deep link navigation
- ✅ 0 regressions in existing functionality
- ✅ User satisfaction with link sharing
- ✅ Faster time to quiz start from links

---

**Status**: ✅ Implementation Complete  
**Version**: 1.0.0  
**Last Updated**: January 2026  
**Maintainer**: Development Team

For questions or issues, start with the documentation then contact the team.
