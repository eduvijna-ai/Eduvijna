# OpenQuiz Architecture Refactor - Complete Documentation

## Overview

The OpenQuiz handling flow has been completely refactored to establish a **single source of truth** for all quiz validation, availability checking, and navigation decisions.

---

## Architecture Principles

### 1. Single Source of Truth
**`handleOpenQuiz`** is the ONLY place where quiz validation logic exists.

### 2. Clear Separation of Concerns
- **handleOpenQuiz**: Validates and decides navigation
- **QuizTakingScreen**: Renders quiz UI only
- **App.tsx**: Detects deep links/notifications and calls handleOpenQuiz

### 3. Normalized Data Structure
All quiz data is converted to a consistent `NormalizedQuiz` shape before navigation.

---

## Component Responsibilities

### handleOpenQuiz (openQuizHandler.ts)

**SINGLE SOURCE OF TRUTH** for all quiz logic.

#### Responsibilities:
1. ✅ **Authentication Check**
   - Validate user is logged in
   - Save sessionId for post-login if not authenticated

2. ✅ **Fetch Quiz Data**
   - Call `fetchQuizDetailsBySessionId` with sessionId
   - Receive validation flags from API

3. ✅ **Quiz Existence Check**
   - Verify quiz exists in database
   - Navigate to "not_found" if missing

4. ✅ **Quiz Availability Check (Time-based)**
   - Check start_time and end_time
   - Determine if quiz is:
     - Not started yet (scheduled)
     - Currently active
     - Expired (past end_time)

5. ✅ **User Role Validation**
   - Determine if user is STUDENT or TEACHER
   - Apply role-specific validation rules

6. ✅ **Student-Specific Validation**
   - Check if quiz is assigned to student
   - Check if student already attempted quiz
   - Navigate to appropriate screen based on status

7. ✅ **Data Normalization**
   - Convert quiz data to `NormalizedQuiz` shape
   - Ensure consistent structure across all quiz types

8. ✅ **Navigation Decision**
   - Navigate to appropriate screen based on validation results
   - Pass normalized quiz data

#### Validation Flow for Students:

```
┌─────────────────────────────────────┐
│ handleOpenQuiz(sessionId)           │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 1. Is user authenticated?           │
│    NO  → Save sessionId, return     │
│    YES → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 2. Show QuizLoadingScreen           │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 3. Fetch quiz with validation       │
│    fetchQuizDetailsBySessionId()    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 4. Does quiz exist?                 │
│    NO  → QuizStatusScreen           │
│           "No Quiz Available"       │
│    YES → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 5. Check quiz availability (time)   │
│    checkQuizAvailability()          │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 6. Is quiz assigned to student?     │
│    NO  → QuizStatusScreen           │
│           "Not Assigned"            │
│    YES → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 7. Already attempted?                │
│    YES → QuizResultsScreen          │
│           (show previous attempt)   │
│    NO  → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 8. Quiz scheduled for future?       │
│    YES → QuizStatusScreen           │
│           "Not Started Yet"         │
│    NO  → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 9. Quiz expired?                    │
│    YES → QuizStatusScreen           │
│           "Quiz Expired"            │
│    NO  → Continue                   │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 10. Quiz is AVAILABLE!              │
│     Normalize data → NormalizedQuiz │
│     Navigate to QuizTakingScreen    │
└─────────────────────────────────────┘
```

#### Navigation Outcomes:

| Condition | Screen | Status | Message |
|-----------|--------|--------|---------|
| Not authenticated | *(save session)* | - | Login required |
| Quiz doesn't exist | QuizStatusScreen | not_found | "No quiz available for you" |
| **STUDENT:** Not assigned | QuizStatusScreen | not_assigned | "Quiz not assigned to you" |
| **STUDENT:** Already attempted | QuizResultsScreen | - | Show previous results |
| **STUDENT:** Not started | QuizStatusScreen | scheduled | "Available from X to Y" |
| **STUDENT:** Expired | QuizStatusScreen | expired | "Expired on X" |
| **STUDENT:** Available | QuizTakingScreen | - | Take quiz |
| **TEACHER:** Available | QuizPreviewScreen | - | Preview quiz |

---

### QuizTakingScreen

**ONLY RENDERS QUIZ UI** - NO validation logic.

#### Responsibilities:
1. ✅ Receive normalized quiz data from params
2. ✅ Display quiz questions
3. ✅ Handle answer selection
4. ✅ Manage quiz timer
5. ✅ Submit quiz results
6. ✅ Handle quiz actions (regenerate, share, etc.)

#### What QuizTakingScreen Does NOT Do:
- ❌ Check quiz availability
- ❌ Validate user assignment
- ❌ Check attempt status
- ❌ Verify quiz expiration
- ❌ Fetch quiz data by sessionId
- ❌ Redirect based on quiz rules

#### Assumptions:
- Quiz data is ALWAYS valid (validated by handleOpenQuiz)
- User has permission to take quiz
- Quiz is currently active and available
- Questions array is populated and properly formatted

#### Data Flow:
```typescript
// Received from handleOpenQuiz
const { quiz: normalizedQuiz } = route.params;

// NormalizedQuiz structure guaranteed by handleOpenQuiz
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

### App.tsx

**LIMITED TO DETECTION AND DELEGATION**

#### Responsibilities:
1. ✅ Detect deep links (URLs from WhatsApp, etc.)
2. ✅ Listen for push notifications
3. ✅ Prevent duplicate triggers (session guards)
4. ✅ Extract sessionId
5. ✅ Call `handleOpenQuiz(sessionId, ...)`

#### What App.tsx Does NOT Do:
- ❌ Validate quiz data
- ❌ Check user permissions
- ❌ Decide navigation destinations
- ❌ Perform quiz availability checks

#### Session Guard Logic:
```typescript
// Different sessions → Process immediately
if (sessionId !== lastProcessedSessionId) {
  console.log('✅ Processing new different session');
  handleOpenQuiz(sessionId, ...);
}

// Same session within 2 seconds → Block duplicate
if (sessionId === lastProcessedSessionId && now - lastProcessedTime < 2000) {
  console.log('🚫 Blocking duplicate session');
  return;
}

// Same session after 2 seconds → Allow re-processing
if (sessionId === lastProcessedSessionId && now - lastProcessedTime >= 2000) {
  console.log('✅ Re-processing same session (after timeout)');
  handleOpenQuiz(sessionId, ...);
}
```

---

## Data Normalization

### NormalizedQuiz Structure

All quiz data is converted to this consistent shape:

```typescript
export interface NormalizedQuiz {
  // Core identifiers
  quizId: string | number;
  sessionId: string | null;
  classroomId: string | null;
  
  // Quiz type
  type: 'SELF' | 'ASSIGNED';
  
  // Metadata
  title: string;
  class?: string;
  subject?: string;
  difficulty?: string;
  lesson?: string;
  
  // Settings
  duration: number;
  has_time_limit?: boolean;
  
  // Questions (normalized)
  questions: NormalizedQuestion[];
  
  // Scheduling (for assigned quizzes)
  start_time?: string | null;
  end_time?: string | null;
  
  // Regeneration support
  regenerationParams?: any;
}
```

### NormalizedQuestion Structure

```typescript
export interface NormalizedQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer?: string;
  answer?: string;
  explanation: string | null;
}
```

### Normalization Process

The `normalizeQuizData()` function in `handleOpenQuiz`:

1. **Parse questions from various formats**
   - Array format: `quizData.questions`
   - Subject field: `quizData.subject` (JSON parsed)
   - API response: `quizData.questions.quizzes`

2. **Validate and structure questions**
   - Ensure each question has an ID
   - Validate options array
   - Normalize answer fields

3. **Determine quiz type**
   - ASSIGNED: Has sessionId or classroomId
   - SELF: No assignment info

4. **Extract metadata**
   - Title, class, subject, difficulty, lesson
   - Duration, time limits
   - Scheduling info (start/end times)

---

## Deep Link Flow

### URL Format
```
https://ui.eduvijna.com/openquiz?session_id=sess_abc123
```

### Complete Flow

```
User clicks WhatsApp link
         │
         ▼
App detects deep link (App.tsx)
         │
         ▼
parseDeepLink extracts sessionId
         │
         ▼
subscribeToDeepLinks callback
         │
         ▼
Check session guards
         │
         ├─ Different session → Process
         ├─ Same session < 2s → Block
         └─ Same session > 2s → Process
         │
         ▼
handleOpenQuiz(sessionId, 'deep_link', user, ...)
         │
         ▼
[Complete Validation Flow - See diagram above]
         │
         ▼
Navigate to appropriate screen with normalized data
```

---

## Push Notification Flow

### Notification Payload
```json
{
  "data": {
    "sessionId": "sess_xyz789",
    "type": "quiz_notification"
  }
}
```

### Complete Flow

```
User taps notification
         │
         ▼
responseListener fires (App.tsx)
         │
         ▼
Extract sessionId from data
         │
         ▼
Check processedNotifications set
         │
         ├─ Already processed → Skip
         └─ New notification → Continue
         │
         ▼
handleOpenQuiz(sessionId, 'notification', user, ...)
         │
         ▼
[Complete Validation Flow - See diagram above]
         │
         ▼
Navigate to appropriate screen with normalized data
```

---

## Benefits of This Architecture

### 1. **No Duplicate Validation Logic**
All validation rules exist in ONE place: `handleOpenQuiz`

### 2. **Predictable Navigation**
Navigation decisions are centralized and consistent

### 3. **Cleaner Components**
QuizTakingScreen is focused on rendering, not validation

### 4. **Easier Testing**
Single function to test for all validation scenarios

### 5. **Consistent Data Structure**
NormalizedQuiz ensures all screens receive the same data shape

### 6. **Safer Navigation**
Users can safely return to Dashboard/Assessments from any screen

### 7. **Better Error Handling**
Validation errors caught early and handled gracefully

---

## Migration Notes

### What Changed

#### handleOpenQuiz:
- ✅ Added `checkQuizAvailability()` function (moved from QuizTakingScreen)
- ✅ Added `normalizeQuizData()` function
- ✅ Enhanced validation flow with time-based availability
- ✅ Improved navigation messages with formatted dates
- ✅ All quiz data normalized before navigation

#### QuizTakingScreen:
- ❌ REMOVED `checkQuizAvailability()` function
- ❌ REMOVED all quiz availability checking logic
- ❌ REMOVED `quizNotAvailable` state
- ❌ REMOVED "Quiz Not Yet Available" UI
- ❌ REMOVED quiz data fetching from API
- ❌ REMOVED console.log validation spam
- ✅ Simplified to accept `quiz` param with normalized data
- ✅ Minimal validation (only check if data exists)
- ✅ Changed error navigation to Dashboard

#### App.tsx:
- ✅ Enhanced session guard logging
- ✅ Improved guard timeout (1s → 2s)
- ✅ Better duplicate detection
- ✅ Clear distinction between different vs duplicate sessions

### Backward Compatibility

QuizTakingScreen still accepts legacy params for non-OpenQuiz flows:
- `quizData` - Legacy quiz data format
- `showShareButton` - Display share button
- `showActionButtons` - Display action buttons (regenerate, etc.)
- `onNewQuiz` - Callback for new quiz

The screen will use `quiz` param if available (from handleOpenQuiz), otherwise fall back to `quizData`.

---

## Testing Scenarios

### 1. Different Session URLs
```
Click URL 1: sess_aaa → ✅ Processing new different session
Click URL 2: sess_bbb → ✅ Processing new different session
Click URL 3: sess_ccc → ✅ Processing new different session
```

### 2. Duplicate Session Prevention
```
Click sess_aaa
Click sess_aaa again (< 2s) → 🚫 Blocking duplicate session
```

### 3. Re-processing After Timeout
```
Click sess_aaa
Wait 3 seconds
Click sess_aaa again → ✅ Re-processing same session (after timeout)
```

### 4. Student Validation Flow
```
Not assigned    → QuizStatusScreen "Not Assigned"
Already tried   → QuizResultsScreen (show results)
Not started     → QuizStatusScreen "Not Started Yet"
Expired         → QuizStatusScreen "Expired"
Available       → QuizTakingScreen (take quiz)
```

### 5. Teacher Flow
```
Any valid quiz  → QuizPreviewScreen
```

### 6. Error Cases
```
No quiz found   → QuizStatusScreen "No Quiz Available"
Network error   → QuizStatusScreen "Error Loading Quiz"
```

---

## Code Examples

### handleOpenQuiz Usage (App.tsx)

```typescript
const navigationAdapter = {
  navigate: (screen: string, params?: any) => {
    navigationRef.current?.navigate(screen, params);
  },
  alert: Alert.alert,
};

await handleOpenQuiz(
  sessionId,
  'deep_link', // or 'notification' or 'post_login'
  user,
  navigationAdapter,
  setPendingSessionId
);
```

### QuizTakingScreen Usage

```typescript
// From handleOpenQuiz
navigationAdapter.navigate('QuizTakingScreen', {
  quiz: normalizedQuiz, // NormalizedQuiz structure
});

// QuizTakingScreen receives
const { quiz } = route.params;
// quiz is guaranteed to be valid and normalized
```

---

## Summary

This refactor establishes **handleOpenQuiz as the single source of truth** for all OpenQuiz validation logic. It:

1. Centralizes all validation in one place
2. Normalizes quiz data to consistent structure
3. Simplifies QuizTakingScreen to UI-only
4. Provides clear, predictable navigation
5. Eliminates duplicate validation code
6. Improves maintainability and testability

**The result**: A cleaner, more maintainable architecture with predictable behavior across all OpenQuiz entry points (deep links, push notifications, and in-app navigation).
