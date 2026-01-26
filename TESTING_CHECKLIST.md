# Testing Checklist - G:\Eduvijna Implementation

## 🧪 Complete Testing Guide

### Pre-Testing Setup
- [ ] Install dependencies: `npm install` or `yarn install`
- [ ] Clear app data/cache on test device
- [ ] Ensure backend API is running and accessible
- [ ] Have test accounts ready (teacher, student, admin)
- [ ] Enable debug logging in app

---

## 1️⃣ Profile Screen Testing

### Visual Verification
- [ ] Profile screen loads without errors
- [ ] Avatar displays correctly
- [ ] Online status indicator shows (green dot)
- [ ] Name displays correctly
- [ ] Email displays correctly
- [ ] Role chip shows with correct color:
  - [ ] Teacher → Purple background
  - [ ] Student → Blue background
  - [ ] Admin → Red background

### Account Settings Section
- [ ] Email field is displayed
- [ ] Email edit button (✎) appears
- [ ] Click edit → Email becomes editable
- [ ] Edit email → Save → Success message
- [ ] Email updates in UI
- [ ] Cancel edit → Reverts changes

- [ ] Password field shows as dots (••••••)
- [ ] Password edit button appears
- [ ] Click edit → Shows change password form
- [ ] Change password → Save → Success message
- [ ] Invalid password → Shows error

### Notification Settings Section (Mobile Only)
- [ ] "Push Notifications" section appears on mobile
- [ ] Section does NOT appear on web
- [ ] Toggle switch is present
- [ ] Description text is readable
- [ ] Toggle reflects current status (ON/OFF)

### Appearance Section
- [ ] "Theme" row appears
- [ ] Description text is present
- [ ] Arrow indicator shows (→)
- [ ] Click → Navigates to theme settings
- [ ] Back button returns to profile

### Account Actions Section
- [ ] Logout button appears
- [ ] Button has logout icon (🚪)
- [ ] Click logout → Shows confirmation dialog
- [ ] Confirm → Logs out and navigates to login
- [ ] Cancel → Stays on profile

### Responsive Design
- [ ] Looks good on small phones (iPhone SE)
- [ ] Looks good on large phones (iPhone 15 Pro Max)
- [ ] Looks good on tablets
- [ ] Looks good on web browser
- [ ] Landscape mode works properly

---

## 2️⃣ Push Notifications - Post-Login Prompt

### First Login (Push Not Enabled)
- [ ] Login with fresh account
- [ ] Wait 1.5 seconds
- [ ] Prompt appears as modal overlay
- [ ] Prompt has bell icon (🔔)
- [ ] Title says "Enable Push Notifications"
- [ ] Benefits list shows:
  - [ ] ✓ Instant quiz alerts
  - [ ] ✓ New assignments
  - [ ] ✓ Grade notifications
  - [ ] ✓ Important updates
- [ ] "Enable Push Notifications" button appears
- [ ] "I'll Do This Later" button appears

### "Enable" Button Testing
- [ ] Click "Enable Push Notifications"
- [ ] Button shows loading spinner
- [ ] OS permission dialog appears
- [ ] Grant permission → Success alert
- [ ] Modal closes automatically
- [ ] Check Profile → Toggle is ON
- [ ] Logout and login again → No prompt

### "Later" Button Testing
- [ ] Login with account
- [ ] Prompt appears
- [ ] Click "I'll Do This Later"
- [ ] Modal closes immediately
- [ ] Logout and login again immediately → No prompt
- [ ] Check after 25 hours → Prompt appears again

### Permission Denied Testing
- [ ] Login with fresh account
- [ ] Click "Enable"
- [ ] Deny permission in OS dialog
- [ ] Error message appears
- [ ] Modal stays open
- [ ] Can try again

### Edge Cases
- [ ] Already enabled → No prompt on login
- [ ] Web platform → No prompt on login
- [ ] Recently dismissed (< 24h) → No prompt
- [ ] No internet connection → Handles gracefully

---

## 3️⃣ Push Notifications - Profile Toggle

### Toggle ON (From OFF State)
- [ ] Open Profile screen
- [ ] Push toggle is OFF
- [ ] Tap toggle to ON
- [ ] Toggle shows loading spinner
- [ ] OS permission dialog appears
- [ ] Grant permission
- [ ] Toggle updates to ON
- [ ] Success alert appears
- [ ] Close and reopen profile → Still ON
- [ ] Restart app → Still ON

### Toggle OFF (From ON State)
- [ ] Open Profile screen
- [ ] Push toggle is ON
- [ ] Tap toggle to OFF
- [ ] Toggle shows loading spinner
- [ ] No permission dialog
- [ ] Toggle updates to OFF
- [ ] Success message appears
- [ ] Close and reopen profile → Still OFF
- [ ] Restart app → Still OFF

### Error Handling
- [ ] Toggle ON with no internet → Error message
- [ ] Toggle OFF with no internet → Error message
- [ ] Backend error → Shows error alert
- [ ] Invalid token → Handles gracefully

### Loading States
- [ ] Loading spinner appears during API call
- [ ] Toggle is disabled during loading
- [ ] Can't tap toggle while loading
- [ ] Loading completes in reasonable time

### Persistence
- [ ] Enable push → Logout → Login → Still enabled
- [ ] Disable push → Logout → Login → Still disabled
- [ ] Clear app data → Settings reset

---

## 4️⃣ Push Notification Service Testing

### Status Check
```typescript
// In app code or debug console
import PushNotificationService from '@core/services/PushNotificationService';

const status = await PushNotificationService.getPushStatus();
console.log('Status:', status);
// Should show: { isEnabled, isSupported, token, tokenId }
```

**Verify:**
- [ ] `isEnabled` matches toggle state
- [ ] `isSupported` is true on iOS/Android
- [ ] `isSupported` is false on web
- [ ] `token` is present when enabled
- [ ] `tokenId` is present when enabled

### Enable Function
```typescript
const result = await PushNotificationService.enablePushNotifications();
console.log('Result:', result);
```

**Verify:**
- [ ] `result.success` is true when successful
- [ ] `result.message` has success message
- [ ] Token stored in AsyncStorage
- [ ] Token ID stored in AsyncStorage
- [ ] Device type stored correctly

### Disable Function
```typescript
const result = await PushNotificationService.disablePushNotifications();
console.log('Result:', result);
```

**Verify:**
- [ ] `result.success` is true
- [ ] AsyncStorage cleared
- [ ] Backend device unregistered

### Sync After Login
```typescript
await PushNotificationService.syncStatusAfterLogin();
const status = await PushNotificationService.getPushStatus();
```

**Verify:**
- [ ] Syncs local state with backend
- [ ] Clears invalid tokens
- [ ] Updates UI accordingly

---

## 5️⃣ API Integration Testing

### Registration Endpoint
**Test:** Enable push notifications

**Backend Verification:**
- [ ] POST request sent to `/api/notifications/devices/register`
- [ ] Authorization header includes JWT token
- [ ] Request body contains:
  - [ ] `token` (Expo push token)
  - [ ] `device_type` ('ios' or 'android')
  - [ ] `device_info.name` (device model)
  - [ ] `device_info.os_version` (OS version)
  - [ ] `device_info.app_version` (app version)
- [ ] Response contains `id` (token_id)
- [ ] Response contains success message
- [ ] Device appears in backend database

### Unregistration Endpoint
**Test:** Disable push notifications

**Backend Verification:**
- [ ] DELETE request sent to `/api/notifications/devices/{token_id}`
- [ ] Authorization header includes JWT token
- [ ] Correct token_id used in URL
- [ ] Response confirms deletion
- [ ] Device removed from backend database

### Error Responses
- [ ] 401 Unauthorized → Logs out user
- [ ] 400 Bad Request → Shows error message
- [ ] 500 Server Error → Shows error message
- [ ] Network timeout → Shows error message

---

## 6️⃣ Platform-Specific Testing

### iOS Testing
- [ ] Push notification permission dialog appears
- [ ] Permission granted → Token generated
- [ ] Permission denied → Error handled
- [ ] App permissions in Settings show correctly
- [ ] Toggle works in app settings
- [ ] Notification badge appears (if implemented)

### Android Testing
- [ ] Push notification permission dialog appears (Android 13+)
- [ ] Permission granted → Token generated
- [ ] Permission denied → Error handled
- [ ] App permissions in Settings show correctly
- [ ] Toggle works in app settings
- [ ] Notification channel created (if implemented)

### Web Testing
- [ ] No push prompt on login
- [ ] No push toggle in profile
- [ ] No errors in console
- [ ] Profile screen works normally
- [ ] Other features unaffected

---

## 7️⃣ Storage Testing

### AsyncStorage Keys
Open React Native Debugger or use debug tool:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const keys = await AsyncStorage.getAllKeys();
const pushKeys = keys.filter(k => k.includes('push'));
const data = await AsyncStorage.multiGet(pushKeys);
console.log('Push Storage:', data);
```

**When Push Enabled, Verify:**
- [ ] `push_notifications_enabled` = 'true'
- [ ] `push_notifications_token` = 'ExponentPushToken[...]'
- [ ] `push_notifications_token_id` = '{number}'
- [ ] `push_notifications_device_type` = 'ios' or 'android'

**When Push Disabled, Verify:**
- [ ] All push keys are removed

**When Prompt Dismissed, Verify:**
- [ ] `push_prompt_last_dismissed` = ISO timestamp

---

## 8️⃣ User Experience Testing

### First-Time User Journey
1. [ ] Create new account
2. [ ] Login successfully
3. [ ] Wait 1.5 seconds → Prompt appears
4. [ ] Click "Enable" → Permission requested
5. [ ] Grant permission → Success message
6. [ ] Navigate to Profile → Toggle is ON
7. [ ] Logout
8. [ ] Login again → No prompt (already enabled)

### Experienced User Journey
1. [ ] Login with existing account
2. [ ] Navigate to Profile
3. [ ] See push toggle in current state
4. [ ] Toggle ON/OFF as desired
5. [ ] See immediate feedback
6. [ ] Settings persist across sessions

### Dismissive User Journey
1. [ ] Login
2. [ ] See prompt
3. [ ] Click "Later"
4. [ ] Continue using app normally
5. [ ] Logout and login again → No prompt
6. [ ] Wait 25+ hours
7. [ ] Login → Prompt appears again

---

## 9️⃣ Error Scenarios

### Network Errors
- [ ] Enable with no internet → Clear error message
- [ ] Disable with no internet → Clear error message
- [ ] Slow network → Shows loading, doesn't freeze

### Permission Errors
- [ ] Deny permission → Helpful error message
- [ ] Permission restricted → Clear explanation
- [ ] Can retry after fixing permissions

### Token Errors
- [ ] Invalid token → Cleared and regenerated
- [ ] Expired token → Refreshed
- [ ] Duplicate token → Handled gracefully

### Backend Errors
- [ ] 500 error → User-friendly message
- [ ] 401 error → Logs out user
- [ ] 400 error → Shows validation message

---

## 🔟 Regression Testing

### Existing Features Still Work
- [ ] Login/logout functions properly
- [ ] Dashboard loads correctly
- [ ] Assessments screen works
- [ ] Analytics screen works
- [ ] Theme settings work
- [ ] Notifications screen works
- [ ] All navigation functions properly

### No New Bugs Introduced
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No UI glitches
- [ ] No performance degradation
- [ ] No memory leaks

---

## 📱 Device Testing Matrix

### Required Device Testing

| Device Type | iOS | Android | Web |
|-------------|-----|---------|-----|
| Phone (Small) | [ ] | [ ] | [ ] |
| Phone (Large) | [ ] | [ ] | [ ] |
| Tablet | [ ] | [ ] | [ ] |

### OS Version Testing

| OS Version | Tested |
|------------|--------|
| iOS 15.x | [ ] |
| iOS 16.x | [ ] |
| iOS 17.x | [ ] |
| Android 11 | [ ] |
| Android 12 | [ ] |
| Android 13+ | [ ] |

---

## 🎯 Acceptance Criteria

### Must Pass (Critical)
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Push toggle works on mobile
- [ ] Post-login prompt appears when appropriate
- [ ] Settings persist across sessions
- [ ] API integration works correctly
- [ ] All platforms supported (including web graceful degradation)

### Should Pass (Important)
- [ ] Loading states appear
- [ ] Success/error messages show
- [ ] UI looks polished
- [ ] Smooth animations
- [ ] Responsive design works

### Nice to Have (Optional)
- [ ] Haptic feedback on toggle
- [ ] Animated transitions
- [ ] Advanced error recovery

---

## 📊 Test Results Template

### Test Session Information
- **Date:** _______________
- **Tester:** _______________
- **App Version:** _______________
- **Device:** _______________
- **OS Version:** _______________

### Results Summary

| Category | Pass | Fail | Skip | Notes |
|----------|------|------|------|-------|
| Profile UI | ☐ | ☐ | ☐ | |
| Post-Login Prompt | ☐ | ☐ | ☐ | |
| Profile Toggle | ☐ | ☐ | ☐ | |
| Service Methods | ☐ | ☐ | ☐ | |
| API Integration | ☐ | ☐ | ☐ | |
| Platform Support | ☐ | ☐ | ☐ | |
| Storage | ☐ | ☐ | ☐ | |
| UX Testing | ☐ | ☐ | ☐ | |
| Error Handling | ☐ | ☐ | ☐ | |
| Regression | ☐ | ☐ | ☐ | |

### Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Overall Status: ☐ PASS  ☐ FAIL  ☐ PARTIAL

---

## 🐛 Common Issues & Solutions

### Issue: Prompt doesn't appear
- **Check:** AsyncStorage for `push_notifications_enabled`
- **Check:** AsyncStorage for `push_prompt_last_dismissed`
- **Check:** Platform is mobile (not web)
- **Check:** User is logged in

### Issue: Toggle doesn't work
- **Check:** Network connection
- **Check:** Backend API health
- **Check:** Console for errors
- **Check:** AsyncStorage permissions

### Issue: Permissions denied
- **Solution:** Guide user to Settings → App → Notifications
- **iOS:** Settings → Eduvijna → Notifications
- **Android:** Settings → Apps → Eduvijna → Notifications

### Issue: Token not saved
- **Check:** AsyncStorage write succeeded
- **Check:** API response included `id`
- **Check:** No errors in service logs

---

## ✅ Final Checklist

Before marking implementation as complete:

- [ ] All critical tests pass
- [ ] No blocking bugs found
- [ ] Documentation reviewed
- [ ] Code reviewed for quality
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] All platforms tested
- [ ] Backend integration verified
- [ ] User experience is smooth
- [ ] Ready for production deployment

---

## 📝 Notes Section

Use this space for additional observations:

______________________________________________________
______________________________________________________
______________________________________________________
______________________________________________________

---

**Testing Completion Date:** _______________  
**Approved By:** _______________  
**Status:** ☐ APPROVED  ☐ NEEDS WORK  ☐ BLOCKED  

---

## 🎉 Success Criteria

Implementation is successful when:
1. ✅ All critical tests pass
2. ✅ Push notifications can be enabled/disabled
3. ✅ Settings persist correctly
4. ✅ UI looks professional
5. ✅ No major bugs found
6. ✅ All platforms work (including web graceful degradation)
7. ✅ API integration is solid
8. ✅ User experience is smooth

**When all checkboxes are ✅, implementation is COMPLETE! 🚀**
