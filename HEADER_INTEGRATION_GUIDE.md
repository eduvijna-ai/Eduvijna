# Header Create Button Integration Guide

## Overview
The Header component now includes a "+ Create" button that displays a dropdown menu with all quiz creation options for teachers.

## Features Added

### 1. Create Button
- **Visibility**: Only shown to users with `role === 'teacher'`
- **Label**: Displays "+ Create" with an icon
- **Position**: Centered between logo and notification/profile sections
- **Color**: Purple (#5B21B6) matching the app theme

### 2. Dropdown Menu
- **6 Creation Options**:
  1. **AI Quiz** - Generate with AI (Blue)
  2. **Document Quiz** - From PDF/Doc (Red)
  3. **Image Quiz** - From Image (Purple)
  4. **Website Quiz** - From URL (Cyan)
  5. **YouTube Quiz** - From Video (Red)
  6. **Manual Quiz** - Create Manually (Amber)

- **Navigation**: Automatically routes to the appropriate create screen when an option is selected

## Updated Props

```typescript
interface HeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onNavigate?: (screen: string, params?: any) => void; // NEW
  navigation?: any; // NEW
  notificationCount?: number;
  showCreateButton?: boolean; // NEW - default: true
}
```

## Usage Examples

### Example 1: With React Navigation
```tsx
import Header from '@core/components/Header';

function MyScreen({ navigation }) {
  return (
    <Header
      navigation={navigation}
      onNotificationPress={() => navigation.navigate('Notifications')}
      onProfilePress={() => navigation.navigate('Profile')}
      notificationCount={5}
    />
  );
}
```

### Example 2: With Custom Navigation Callback
```tsx
import Header from '@core/components/Header';

function MyScreen() {
  const handleNavigate = (screen: string, params?: any) => {
    // Custom navigation logic
    console.log('Navigate to:', screen, params);
  };

  return (
    <Header
      onNavigate={handleNavigate}
      onNotificationPress={() => console.log('Notifications')}
      onProfilePress={() => console.log('Profile')}
    />
  );
}
```

### Example 3: Hide Create Button (for students)
```tsx
import Header from '@core/components/Header';

function StudentScreen({ navigation }) {
  return (
    <Header
      navigation={navigation}
      onNotificationPress={() => navigation.navigate('Notifications')}
      onProfilePress={() => navigation.navigate('Profile')}
      showCreateButton={false}
    />
  );
}
```

## Navigation Routes Required

Make sure your navigation stack includes these screens:

```typescript
// Navigation Stack
const Stack = createNativeStackNavigator();

<Stack.Navigator>
  {/* ... other screens ... */}
  <Stack.Screen name="CreateAIQuiz" component={CreateAIQuizScreen} />
  <Stack.Screen name="CreateDocumentQuiz" component={CreateDocumentQuizScreen} />
  <Stack.Screen name="CreateImageQuiz" component={CreateImageQuizScreen} />
  <Stack.Screen name="CreateWebsiteQuiz" component={CreateWebsiteQuizScreen} />
  <Stack.Screen name="CreateYouTubeQuiz" component={CreateYouTubeQuizScreen} />
  <Stack.Screen name="CreateManualQuiz" component={CreateManualQuizScreen} />
</Stack.Navigator>
```

## User Flow

1. **Teacher logs in** → Header shows "+ Create" button
2. **Teacher clicks "+ Create"** → Dropdown menu appears
3. **Teacher selects option** (e.g., "AI Quiz") → Navigation to CreateAIQuiz screen
4. **Student logs in** → Header doesn't show "+ Create" button (auto-hidden based on role)

## Styling Details

### Create Button
- Background: `#5B21B6` (Purple)
- Text: `#FFFFFF` (White)
- Font Weight: `600` (Semi-bold)
- Border Radius: `8px`
- Padding: `8px 16px`

### Dropdown Menu
- Background: `#FFFFFF` (White)
- Border Radius: `12px`
- Shadow: Elevated with blur
- Min Width: `280px`
- Max Width: `320px`

### Menu Items
- Icon Circle: `40x40` with colored background
- Title: `15px`, Semi-bold
- Description: `12px`, Gray
- Hover: Platform-specific (web cursor pointer)

## Platform Compatibility

✅ **iOS** - Full support with native modals
✅ **Android** - Full support with native modals
✅ **Web** - Full support with cursor pointer on hover

## Role-Based Access

The create button automatically shows/hides based on `user.role`:

```typescript
const isTeacher = user?.role === 'teacher';

{isTeacher && showCreateButton && (
  <TouchableOpacity style={styles.createButton}>
    {/* Create button */}
  </TouchableOpacity>
)}
```

## Technical Notes

1. **State Management**: Uses `useState` for dropdown visibility
2. **Modal**: Uses React Native `Modal` component with transparent background
3. **Navigation Support**: Supports both `navigation.navigate()` and `onNavigate()` callback
4. **Accessibility**: Pressable overlay allows closing modal by tapping outside
5. **Animation**: Fade animation for smooth modal appearance

## Next Steps

1. ✅ Header component updated with Create button
2. ⚠️ Update your navigation configuration to include create screens
3. ⚠️ Test with teacher and student accounts
4. ⚠️ Implement API integration in create screens
5. ⚠️ Add file picker functionality to Document and Image quiz screens

## Support

If the create button doesn't appear:
- Verify `user.role === 'teacher'`
- Check `showCreateButton` prop (default is `true`)
- Ensure `useAuth()` hook returns user data correctly

If navigation fails:
- Verify navigation prop is passed
- Ensure all create screens are registered in navigation stack
- Check screen names match exactly (case-sensitive)
