# Unified OpenQuiz Handler - Complete Implementation

## ✅ Implementation Complete

The unified OpenQuiz handling flow is now fully implemented and working correctly across all scenarios.

## 📋 Overview

All quiz access logic (deep links, push notifications, logged-in/logged-out users) has been centralized into a single, reusable handler function.

## 🏗️ Architecture

### Core Function
```typescript
handleOpenQuiz(
  sessionId: string,
  source: 'deep_link' | 'notification',
  user: User | null,
  navigationHelpers: NavigationHelpers
): Promise<OpenQuizResult>
```

**Location:** `src/core/services/openQuizHandler.ts`

## 🔄 Execution Flow (Mandatory Order)

### Step 1: Login Check
- ✅ Handled by caller **BEFORE** calling `handleOpenQuiz`
- If not logged in:
  - Save `sessionId` to `pendingSessionId` state
  - User navigates to login
  - After successful login, `useEffect` automatically resumes `handleOpenQuiz`

### Step 2: Fetch Quiz Data
- ✅ Call `getQuizBySessionId(sessionId, true)`
- Returns quiz data with questions, duration, etc.

### Step 3: Validate Quiz Exists
- ✅ Check if `quizResponse.success && quizResponse.quiz_data`
- **If quiz not found:**
  - Show Alert: "Quiz Not Available"
  - Buttons: "Go to Assessments" | "OK"
  - Do NOT navigate
  - Exit function

### Step 4: Determine User Role
- ✅ Check `user.role === 'instructor' || user.role === 'admin'`
- Set `isTeacher` flag

### Step 5A: Teacher Flow
- ✅ Teachers navigate directly to `QuizPreviewScreen`
- No enrollment or attempt checks
- No restrictions
- `showShareButton: true`
- `showActionButtons: true`

### Step 5B: Student Flow - Check Enrollment
- ✅ Call `checkStudentEnrollment(classroomId, studentId)`
- **If NOT enrolled:**
  - Show Alert: "Access Denied - You are not enrolled in this classroom"
  - Buttons: "Go to Assessments" | "OK"
  - Do NOT navigate
  - Exit function

### Step 6: Student Flow - Check Attempt
- ✅ Call `checkStudentEnrollment(classroomId, studentId)`
- **If NOT enrolled:**
  - Show Alert: "Access Denied - You are not enrolled in this classroom"
  - Buttons: "Go to Assessments" | "OK"
  - Do NOT navigate
  - Exit function

### Step 6: Student Flow - Check Attempt
- ✅ Call `checkQuizAttempt(quizId, userId, sessionId)`
- **If already attempted:**
  - Show Alert: "Quiz Already Completed - Score: XX%"
  - Buttons: "View Results" | "Go to Assessments" | "OK"
  - "View Results" navigates to `QuizResultsScreen`
  - Do NOT navigate to QuizTakingScreen
  - Exit function

- **If NOT attempted:**
  - Navigate to `QuizTakingScreen`
  - Pass complete quiz data with all params

## 📁 Files Modified

### 1. `src/core/services/openQuizHandler.ts` (NEW)
**Purpose:** Single source of truth for all quiz access logic

**Exports:**
- `handleOpenQuiz()` - Main handler function
- `executeQuizNavigation()` - Navigation execution helper
- `OpenQuizSource` - Type definition
- `OpenQuizResult` - Return type interface

**Features:**
- ✅ Comprehensive logging for debugging
- ✅ Error handling with user-friendly alerts
- ✅ Role-based routing (teacher vs student)
- ✅ Attempt validation for students
- ✅ Question transformation for quiz screen
- ✅ Custom navigation integration

### 2. `App.tsx`
**Changes:**
- ✅ Import `handleOpenQuiz` and `executeQuizNavigation`
- ✅ Updated notification tap handler
- ✅ Updated post-login resume handler
- ✅ Updated deep link handlers (2 locations)
- ✅ All handlers pass `navigationHelpers` object

**Navigation Helpers:**
```typescript
const navigationHelpers = { 
  setActiveScreen, 
  setNavigationParams 
};
```

## 🔒 Guards & Safety

### Duplicate Prevention
```typescript
// Time-based guard (1 second debounce)
if (sessionId === lastProcessedSessionId && 
    (now - lastProcessedTime) < 1000) {
  return; // Skip duplicate
}
```

### Double Submission Prevention
- ✅ Handled in `QuizTakingScreen.tsx`
- `submitting` flag prevents duplicate submissions

## 🎯 Usage Examples

### Notification Tap (Logged In)
```typescript
// In notification response handler
if (sessionId && user) {
  const navigationHelpers = { setActiveScreen, setNavigationParams };
  handleOpenQuiz(sessionId, 'notification', user, navigationHelpers)
    .then((result) => {
      executeQuizNavigation(result, setActiveScreen, setNavigationParams);
    });
}
```

### Deep Link (Logged Out → Logged In)
```typescript
// Step 1: Deep link received, user not logged in
if (!isAuthenticated) {
  setPendingSessionId(sessionId); // Save for later
  return; // User navigates to login
}

// Step 2: After login, useEffect resumes
useEffect(() => {
  if (isAuthenticated && pendingSessionId && user) {
    const navigationHelpers = { setActiveScreen, setNavigationParams };
    handleOpenQuiz(pendingSessionId, 'notification', user, navigationHelpers)
      .then((result) => {
        executeQuizNavigation(result, setActiveScreen, setNavigationParams);
      });
    setPendingSessionId(null); // Clear
  }
}, [isAuthenticated, pendingSessionId, user]);
```

## 📊 Navigation Params Passed to Screens

### QuizTakingScreen (Student - NOT attempted)
```typescript
{
  quizId: 87,
  sessionId: "uuid",
  classroomId: "class_123", // Added classroom ID
  quizData: {
    quiz_id: 87,
    session_id: "uuid",
    classroom_id: "class_123", // Added classroom ID
    title: "Quiz Title",
    questions: [
      {
        id: "1",
        question: "Question text",
        options: ["A", "B", "C", "D"],
        correctAnswer: "C",
        explanation: null
      }
    ],
    duration: 30,
    has_time_limit: true
  },
  showShareButton: false,
  showActionButtons: false
}
```

### QuizPreviewScreen (Teacher)
```typescript
{
  // Same as above, but:
  showShareButton: true,
  showActionButtons: true
}
```

### QuizResultsScreen (Student - Already attempted)
```typescript
{
  quizId: 87,
  sessionId: "uuid"
}
```

## 🧪 Test Scenarios

### ✅ Scenario 1: Teacher Taps Notification
1. Teacher logged in
2. Taps quiz notification
3. Fetches quiz data
4. Navigates directly to `QuizPreviewScreen`
5. Full quiz data with share/action buttons

### ✅ Scenario 2: Student Taps Notification (First Time)
1. Student logged in
2. Taps quiz notification
3. Fetches quiz data
4. Checks enrollment → Student IS enrolled
5. Checks attempt → Not attempted
6. Navigates to `QuizTakingScreen`
7. Full quiz data ready to take

### ✅ Scenario 2.5: Student Taps Notification (Not Enrolled)
1. Student logged in
2. Taps quiz notification
3. Fetches quiz data
4. Checks enrollment → Student is NOT enrolled
5. Shows alert "Access Denied - You are not enrolled in this classroom"
6. Does NOT navigate
7. Can go to Assessments or dismiss

### ✅ Scenario 3: Student Taps Notification (Already Completed)
1. Student logged in
2. Taps quiz notification
3. Fetches quiz data
4. Checks attempt → Already attempted (score: 80%)
5. Shows alert "Quiz Already Completed - Score: 80%"
6. Does NOT navigate to QuizTakingScreen
7. Can choose "View Results" or "Go to Assessments"

### ✅ Scenario 4: User NOT Logged In (Notification)
1. User taps notification
2. `sessionId` saved to `pendingSessionId`
3. User sees login screen
4. After successful login, `useEffect` triggers
5. `handleOpenQuiz` resumes with saved sessionId
6. Continues with normal flow based on role

### ✅ Scenario 5: Deep Link (eduvijna://openquiz?session_id=xxx)
1. User clicks deep link
2. If logged in → processes immediately
3. If logged out → saves sessionId, shows login
4. Same flow as notifications

### ✅ Scenario 6: Quiz Not Found
1. User accesses invalid sessionId
2. API returns no quiz data
3. Shows alert "Quiz Not Available"
4. Does NOT navigate
5. Can go to Assessments or dismiss

### ✅ Scenario 7: Network Error
1. Quiz data fetch fails
2. Shows alert "Error Loading Quiz"
3. Does NOT navigate
4. Can retry via Assessments

## 🔍 Debugging

All handlers include comprehensive console logging:
- 🚀 Handler start with params
- 📡 API requests
- ✅ Successful operations
- ❌ Errors and failures
- 👤 User role determination
- 📋 Attempt check results
- 🎯 Navigation execution

**Filter logs by:**
- `handleOpenQuiz` - Main handler logs
- `executeQuizNavigation` - Navigation logs
- `Attempt check` - Student attempt validation
- `Quiz params` - Data transformation

## ⚡ Performance Optimizations

### Duplicate Prevention
- ✅ 1-second debounce on sessionId processing
- ✅ Prevents rapid taps causing multiple API calls

### State Management
- ✅ `pendingSessionId` - Handles login resume
- ✅ `lastProcessedSessionId` - Tracks last processed
- ✅ `lastProcessedTime` - Timestamp for debounce

### Error Handling
- ✅ Try-catch wraps all async operations
- ✅ User-friendly alerts on failures
- ✅ Always provides "Go to Assessments" escape route

## 🚫 Constraints Enforced

✅ **No duplicate logic** - Single function for all sources  
✅ **No API calls before login** - Login check is first step  
✅ **No navigation on invalid quiz** - Alerts instead  
✅ **No student re-attempts** - Attempt check prevents  
✅ **No non-enrolled students** - Enrollment check prevents access  
✅ **No business logic in UI** - All in handler  
✅ **Existing nav structure preserved** - Uses setActiveScreen/setNavigationParams  

## 🎉 Benefits

1. **Centralized Logic** - One place to maintain quiz access
2. **Type Safety** - TypeScript interfaces for all params
3. **Error Resilience** - Comprehensive error handling
4. **User Experience** - Clear alerts and navigation
5. **Debuggable** - Extensive logging
6. **Testable** - Pure function with defined inputs/outputs
7. **Scalable** - Easy to add new sources or features

## 📝 Future Enhancements

- [ ] Add analytics tracking for quiz access patterns
- [ ] Cache quiz data for offline access
- [ ] Add quiz expiration handling
- [ ] Support quiz retry with cooldown periods
- [ ] Add loading states during quiz fetch

---

**Status:** ✅ Production Ready  
**Last Updated:** January 30, 2026  
**Tested:** All scenarios validated
