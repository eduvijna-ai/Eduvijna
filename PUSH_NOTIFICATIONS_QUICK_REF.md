# Push Notifications - Quick Reference

## 🎯 What Was Implemented

Push notifications with automatic post-login prompt and profile toggle control.

## 📁 Files Created/Modified

### Created
- `src/core/services/PushNotificationService.ts` - Main service
- `src/components/PushNotificationPrompt.tsx` - Modal component
- `PUSH_NOTIFICATIONS_IMPLEMENTATION.md` - Full documentation

### Modified
- `src/platforms/mobile/screens/Profile.tsx` - Added push toggle + redesign
- `src/platforms/web/screens/Profile.tsx` - Copied mobile version
- `src/platforms/mobile/navigation/BottomTabNavigator.tsx` - Added prompt

## 🚀 Quick Usage

### Check Status
```typescript
import PushNotificationService from '@core/services/PushNotificationService';

const status = await PushNotificationService.getPushStatus();
console.log(status.isEnabled); // true/false
```

### Enable
```typescript
const result = await PushNotificationService.enablePushNotifications();
if (result.success) {
  Alert.alert('Success', result.message);
}
```

### Disable
```typescript
const result = await PushNotificationService.disablePushNotifications();
```

## 🎨 UI Components

### Post-Login Prompt
- Shows 1.5s after login (if push not enabled)
- "Enable" or "Later" options
- 24-hour dismissal tracking

### Profile Toggle
- Settings > Push Notifications
- Real-time enable/disable
- Loading states
- Success/error feedback

## 🔧 API Endpoints

```typescript
// Register device
POST /api/notifications/devices/register
{
  token: "ExponentPushToken[...]",
  device_type: "ios",
  device_info: { name, os_version, app_version }
}

// Unregister device
DELETE /api/notifications/devices/{token_id}
```

## 📱 Platform Support

- ✅ iOS - Full support
- ✅ Android - Full support
- ❌ Web - Gracefully disabled

## 🧪 Test Checklist

- [ ] First login shows prompt
- [ ] "Enable" requests permissions
- [ ] "Later" dismisses for 24h
- [ ] Profile toggle works
- [ ] Settings persist on restart
- [ ] Web platform hides toggle

## 🐛 Debug Tips

### Prompt not showing?
- Check: `AsyncStorage: push_notifications_enabled`
- Check: `AsyncStorage: push_prompt_last_dismissed`
- Platform must be iOS/Android

### Toggle not working?
- Check network connection
- Check backend API health
- Verify permissions granted

## 📝 Storage Keys

```
push_notifications_enabled       // boolean
push_notifications_token         // Expo token
push_notifications_token_id      // Backend ID
push_notifications_device_type   // 'ios'/'android'
push_prompt_last_dismissed       // ISO timestamp
```

## 🎯 Key Features

1. **Auto Prompt** - Shows after login if needed
2. **Profile Toggle** - Manual enable/disable
3. **Persistent** - Survives app restarts
4. **Synced** - Backend + local storage
5. **Smart** - Won't annoy users
6. **Safe** - Handles errors gracefully

---

See `PUSH_NOTIFICATIONS_IMPLEMENTATION.md` for complete documentation.
