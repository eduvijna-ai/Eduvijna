# OpenQuiz Refactor - Quick Reference

## TL;DR

**All quiz validation logic is now in `handleOpenQuiz`.**  
**QuizTakingScreen only renders the quiz UI.**

---

## When to Use What

### Use `handleOpenQuiz` for:
- ✅ Deep link processing
- ✅ Push notification handling  
- ✅ Any quiz access via sessionId
- ✅ Post-login quiz resume

### Use `QuizTakingScreen` for:
- ✅ Displaying quiz questions
- ✅ Handling quiz submission
- ✅ Self-assessment quizzes (direct navigation)

---

## How to Call handleOpenQuiz

```typescript
import { handleOpenQuiz } from '@core/services/openQuizHandler';

// In App.tsx or anywhere you detect a quiz deep link/notification
const navigationAdapter = {
  navigate: (screen: string, params?: any) => {
    navigationRef.current?.navigate(screen, params);
  },
  alert: Alert.alert,
};

await handleOpenQuiz(
  sessionId,           // string - from deep link or notification
  'deep_link',         // 'deep_link' | 'notification' | 'post_login'
  user,                // User object with id and role
  navigationAdapter,   // Navigation functions
  setPendingSessionId  // Optional: save session for post-login
);
```

---

## What handleOpenQuiz Does

```
1. Check authentication
2. Fetch quiz data
3. Validate quiz exists
4. Check time-based availability
5. Validate user role
6. Check student assignment (if student)
7. Check attempt status (if student)
8. Normalize quiz data
9. Navigate to appropriate screen
```

---

## Navigation Outcomes

| User | Condition | Destination |
|------|-----------|-------------|
| Any | Not authenticated | *(save session)* |
| Any | Quiz not found | QuizStatusScreen |
| Student | Not assigned | QuizStatusScreen |
| Student | Already attempted | QuizResultsScreen |
| Student | Not started | QuizStatusScreen |
| Student | Expired | QuizStatusScreen |
| Student | Available | **QuizTakingScreen** |
| Teacher | Available | QuizPreviewScreen |

---

## NormalizedQuiz Structure

```typescript
{
  quizId: string | number,
  sessionId: string | null,
  classroomId: string | null,
  type: 'SELF' | 'ASSIGNED',
  title: string,
  duration: number,
  questions: NormalizedQuestion[],
  // ... other metadata
}
```

---

## QuizTakingScreen Props

```typescript
// New format (from handleOpenQuiz)
{
  quiz: NormalizedQuiz  // ← Preferred
}

// Legacy format (backward compatible)
{
  quizData: any,
  showShareButton?: boolean,
  showActionButtons?: boolean,
  onNewQuiz?: () => void
}
```

---

## Validation Checklist

### handleOpenQuiz Validates:
- [x] User authentication
- [x] Quiz existence
- [x] Time-based availability
- [x] User role
- [x] Student assignment
- [x] Attempt status

### QuizTakingScreen Validates:
- [x] Quiz data exists (minimal check)

---

## Console Logging

### You'll see:
```
✅ Processing new different session: sess_abc123
🚫 Blocking duplicate session within 2 seconds: sess_abc123
✅ Re-processing same session (after timeout): sess_abc123
```

### You won't see (removed):
```
❌ 🏗️ QuizTakingScreen component mounted/updated
❌ 🎯 QuizTakingScreen received params: {...}
❌ 🔍 Quiz validation check at render: {...}
```

---

## Common Patterns

### Deep Link
```typescript
// App.tsx
const deepLinkData = parseDeepLink(url);
if (deepLinkData?.sessionId) {
  await handleOpenQuiz(deepLinkData.sessionId, 'deep_link', user, ...);
}
```

### Push Notification
```typescript
// App.tsx
const sessionId = data?.sessionId;
if (sessionId) {
  await handleOpenQuiz(sessionId, 'notification', user, ...);
}
```

### Direct Navigation (Legacy)
```typescript
// For self-assessment, practice quizzes
navigation.navigate('QuizTakingScreen', {
  quizData: myQuizObject,
  showActionButtons: true,
});
```

---

## Testing Commands

### Test Different Sessions
```
Click URL 1 → Should process
Click URL 2 → Should process
Click URL 3 → Should process
```

### Test Duplicate Prevention
```
Click same URL twice quickly → Second blocked
```

### Test Timeout
```
Click URL → Process
Wait 3 seconds
Click same URL → Process again
```

---

## File Locations

```
src/
├── core/
│   └── services/
│       └── openQuizHandler.ts       ← SINGLE SOURCE OF TRUTH
└── screens/
    └── QuizTakingScreen.tsx          ← UI ONLY
App.tsx                               ← DETECTION & DELEGATION
```

---

## Key Functions

### openQuizHandler.ts
- `handleOpenQuiz()` - Main validation function
- `checkQuizAvailability()` - Time-based validation
- `normalizeQuizData()` - Data normalization

### QuizTakingScreen.tsx
- Render quiz UI
- Handle timer
- Submit quiz
- (No validation)

### App.tsx
- Detect deep links
- Listen for notifications
- Extract sessionId
- Call handleOpenQuiz
- (No validation)

---

## Error Messages

### Quiz Not Found
```
Title: "No Quiz Available"
Message: "No quiz is available for you."
```

### Not Assigned
```
Title: "Quiz Not Assigned"
Message: "This quiz is not assigned to you."
```

### Not Started
```
Title: "Quiz Not Started Yet"
Message: "This quiz will be available from X to Y."
```

### Expired
```
Title: "Quiz Expired"
Message: "This quiz expired on X."
```

### Error Loading
```
Title: "Error Loading Quiz"
Message: "Unable to load quiz details. Please try again later."
```

---

## Exports

```typescript
// From openQuizHandler.ts
import {
  handleOpenQuiz,
  NormalizedQuiz,
  NormalizedQuestion,
  OpenQuizSource,
  QuizValidationResult,
} from '@core/services/openQuizHandler';
```

---

## Migration Checklist

- [x] Move validation to handleOpenQuiz
- [x] Simplify QuizTakingScreen
- [x] Add data normalization
- [x] Update navigation flow
- [x] Remove duplicate code
- [x] Clean up console logs
- [x] Test all scenarios
- [x] Document changes

---

**Status**: ✅ Complete  
**Ready For**: Production Testing

For detailed architecture documentation, see:
- [OPENQUIZ_REFACTOR_ARCHITECTURE.md](./OPENQUIZ_REFACTOR_ARCHITECTURE.md)
- [OPENQUIZ_REFACTOR_SUMMARY.md](./OPENQUIZ_REFACTOR_SUMMARY.md)
