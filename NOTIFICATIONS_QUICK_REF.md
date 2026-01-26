# 🔔 Notifications Quick Reference

## At a Glance

```
Bell Icon (Header) → Click → Dropdown Panel → Click Notification → Navigate to Quiz
     ↓                                ↓
  Unread Badge              Mark as Read (optimistic)
  Auto-polls (30s)          Relative Time Display
```

---

## Components

### 1. useNotifications Hook
**Location:** `src/core/hooks/useNotifications.ts`
```typescript
const {
  notifications,        // Notification[]
  unreadCount,         // number
  loading,             // boolean
  error,               // Error | null
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  refreshAfterQuizGenerated,  // 👈 Call after quiz creation
} = useNotifications();
```

### 2. NotificationBell
**Location:** `src/components/NotificationBell.tsx`
```typescript
<NotificationBell
  unreadCount={unreadCount}
  onPress={() => setShowDropdown(true)}
  iconColor="#374151"      // Optional
  badgeColor="#EF4444"     // Optional
/>
```

### 3. NotificationsDropdown
**Location:** `src/components/NotificationsDropdown.tsx`
```typescript
<NotificationsDropdown
  notifications={notifications}
  loading={loading}
  onClose={() => setShowDropdown(false)}
  onNotificationClick={handleClick}
  onMarkAllRead={handleMarkAll}
  colors={theme.colors}
/>
```

---

## Usage Patterns

### In Headers (Web/Mobile)
```typescript
import useNotifications from '@core/hooks/useNotifications';
import NotificationBell from '@components/NotificationBell';
import NotificationsDropdown from '@components/NotificationsDropdown';

function Header() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const handleNotificationClick = async (notification) => {
    await markNotificationRead(notification.id);
    setShowDropdown(false);
    
    // Navigate based on notification data
    if (notification.data?.quiz_id) {
      navigate('QuizScreen', { quizId: notification.data.quiz_id });
    }
  };
  
  return (
    <>
      <NotificationBell 
        unreadCount={unreadCount}
        onPress={() => setShowDropdown(!showDropdown)}
      />
      
      {showDropdown && (
        <NotificationsDropdown
          notifications={notifications}
          loading={false}
          onClose={() => setShowDropdown(false)}
          onNotificationClick={handleNotificationClick}
          onMarkAllRead={markAllNotificationsRead}
          colors={theme.colors}
        />
      )}
    </>
  );
}
```

### In Quiz Creation Screens
```typescript
import useNotifications from '@core/hooks/useNotifications';

function CreateQuizScreen() {
  const { refreshAfterQuizGenerated } = useNotifications();
  
  const handleGenerateQuiz = async () => {
    const quiz = await generateQuiz(...);
    
    // Refresh notifications after successful creation
    await refreshAfterQuizGenerated();
    
    navigation.navigate('QuizTaking', { quizData: quiz });
  };
  
  return <Button onPress={handleGenerateQuiz}>Generate</Button>;
}
```

---

## Notification Types & Colors

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| `quiz_assigned` | document-text | Blue #3B82F6 | New quiz assigned to student |
| `quiz_graded` | checkmark-circle | Green #10B981 | Quiz results available |
| `classroom_invite` | people | Purple #8B5CF6 | Invited to classroom |
| `announcement` | megaphone | Orange #F59E0B | General announcements |
| `general` | notifications | Primary | Other notifications |

---

## API Endpoints

All APIs in `src/core/api/notifications.api.ts`:

```typescript
// Fetch all notifications
GET /api/v1/notifications
→ Notification[]

// Get unread count
GET /api/v1/notifications/unread/count
→ number

// Mark single as read
PUT /api/v1/notifications/:id/read
→ void

// Mark all as read
PUT /api/v1/notifications/read-all
→ void

// Delete notification
DELETE /api/v1/notifications/:id
→ void
```

---

## Auto-Polling

The hook automatically polls unread count every 30 seconds:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchUnreadCount();
  }, 30000); // 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

**To change interval:** Edit `useNotifications.ts` line ~40

---

## Optimistic Updates

Mark-as-read updates UI immediately, then calls API:

```typescript
// 1. Update UI
setNotifications(prev => 
  prev.map(n => n.id === id ? { ...n, is_read: true } : n)
);
setUnreadCount(prev => Math.max(0, prev - 1));

// 2. Call API in background
await markAsRead(id);

// 3. If error, revert (implement error boundary)
```

---

## Relative Time Format

Uses `date-fns` for human-readable timestamps:

```typescript
import { formatDistanceToNow } from 'date-fns';

formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
// → "2 minutes ago", "1 hour ago", "3 days ago"
```

---

## Notification Data Structure

```typescript
interface Notification {
  id: number;
  user_id: number;
  type: 'quiz_assigned' | 'quiz_graded' | 'classroom_invite' | 'announcement' | 'general';
  title: string;              // "New Quiz Assigned"
  message: string;            // "Algebra Quiz is ready"
  data: {
    quiz_id?: number;         // 123
    classroom_id?: number;    // 456
    [key: string]: any;
  };
  is_read: boolean;           // false
  created_at: string;         // "2024-01-15T10:30:00Z"
  updated_at: string;         // "2024-01-15T10:30:00Z"
}
```

---

## Troubleshooting

### Badge not updating
- Check console for API errors
- Verify polling interval (30s delay)
- Call `refreshAfterQuizGenerated()` after quiz creation

### Dropdown not closing
- Ensure `onClose` prop is provided
- Check if state is properly toggled
- Verify close button click handler

### Navigation not working
- Check `notification.data.quiz_id` exists
- Verify navigation function is correct
- Log notification object to inspect data

### Wrong colors/theme
- Pass `theme.colors` to NotificationsDropdown
- Check theme context is available
- Verify isDark state is correct

---

## Files Reference

```
✅ src/core/hooks/useNotifications.ts          - State management
✅ src/core/api/notifications.api.ts           - API calls
✅ src/components/NotificationBell.tsx         - Bell icon
✅ src/components/NotificationsDropdown.tsx    - Dropdown panel
✅ src/platforms/web/navigation/WebNavigation.tsx  - Web integration

✅ src/screens/CreateAIQuizScreen.tsx          - Refresh trigger
✅ src/screens/CreateDocumentQuizScreen.tsx    - Refresh trigger
✅ src/screens/CreateYouTubeQuizScreen.tsx     - Refresh trigger
✅ src/screens/CreateWebsiteQuizScreen.tsx     - Refresh trigger
✅ src/screens/CreateImageQuizScreen.tsx       - Refresh trigger
```

---

## Next Steps

1. **Test with Backend:** Verify notifications are created on quiz events
2. **Mobile Integration:** Add to mobile header/bottom tab
3. **Navigation:** Navigate to specific quiz screens (not just assessments)
4. **Error Handling:** Add toast/snackbar for API failures
5. **Animation:** Add bell shake/pulse for new notifications
6. **Settings:** Add notification preferences screen

---

**Complete Docs:** [PUSH_NOTIFICATIONS_COMPLETE.md](./PUSH_NOTIFICATIONS_COMPLETE.md)
