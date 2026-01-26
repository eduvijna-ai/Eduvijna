# UNIFIED TYPE SYSTEM - COMPLETE GUIDE

## 📋 Overview

The application now uses a **centralized, unified type system** for all dashboard, quiz, student, and classroom data. This ensures consistency across teacher and student views, eliminates code duplication, and makes the codebase easier to maintain.

## 🎯 Key Principle

> **"The data structure is the same everywhere. Only the presentation differs."**

Teachers and students see the **same underlying data structure**. The only difference is:
- **What data they can access** (filtered by API/permissions)
- **How the data is displayed** (different UI components)

---

## 📁 File Structure

```
src/core/types/
├── dashboard.types.ts    ← SINGLE SOURCE OF TRUTH (NEW)
├── quiz.types.ts         ← Now imports from dashboard.types.ts
└── index.ts              ← Exports all types
```

### Key Files

#### 1. `dashboard.types.ts` - **SINGLE SOURCE OF TRUTH**
- Contains ALL core type definitions
- Used by both teacher and student components
- Includes utility functions for data transformation

#### 2. `quiz.types.ts` - **Backward Compatibility Layer**
- Imports types from `dashboard.types.ts`
- Re-exports for existing code
- Contains API-specific types (BaseQuiz, API responses)

#### 3. `index.ts` - **Centralized Exports**
- Exports all types from both files
- Single import point for components

---

## 🏗️ Core Type Definitions

### 1. QuizAttempt - Universal Attempt Structure

```typescript
interface QuizAttempt {
  // Student identification
  student_id: number;
  student_fullname?: string;
  student_username?: string;
  
  // Attempt details
  attempt_id: number | null;
  attempt_number: number | null;
  score: number | null;
  status: AttemptStatus;  // 'pending' | 'in_progress' | 'completed' | 'missed'
  
  // Quiz reference
  quiz_id: number;
  class_id: string;
  
  // Timing
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  end_time: string; // Deadline
  time_spent_seconds: number | null;
  
  // Question data
  questions: QuizQuestionsData;
  
  // Submission
  submission?: QuizSubmission;
}
```

**Use Cases:**
- ✅ Teacher viewing student attempts
- ✅ Student viewing own attempts
- ✅ API response parsing
- ✅ Progress tracking

### 2. ParsedQuiz - Enriched Display Data

```typescript
interface ParsedQuiz {
  // Core quiz info
  quiz_id: number;
  class_id: string;
  classroom_name: string;
  
  // Status & scoring
  status: AttemptStatus;
  score: number | null;
  
  // Dates
  end_time: string;
  created_at: string;
  completed_at: string | null;
  
  // Computed fields (calculated from QuizAttempt)
  question_count: number;        // from questions.quizzes.length
  correct_answers?: number;      // from submission.log_data
  is_overdue: boolean;           // computed from end_time + status
  days_until_due?: number;       // computed from end_time
}
```

**Use Cases:**
- ✅ Quiz list displays
- ✅ Dashboard cards
- ✅ Student/teacher quiz views
- ✅ UI components

### 3. DashboardStats - Universal Statistics

```typescript
interface DashboardStats {
  // Quiz counts (both teacher & student)
  total_quizzes: number;
  completed_count: number;
  pending_count: number;
  missed_count: number;
  
  // Performance metrics
  average_score: number;
  total_time_spent: number;
  total_questions_attempted: number;
  
  // Teacher-specific (optional)
  total_students?: number;
  total_classes?: number;
  active_assessments?: number;
  
  // Student-specific (optional)
  upcoming_assessments?: number;
  total_practice_time?: number;
}
```

**Use Cases:**
- ✅ Teacher dashboard summary
- ✅ Student dashboard summary
- ✅ Analytics displays

### 4. Student, Classroom, Instructor

```typescript
interface Student {
  student_id: number;
  student_fullname: string;
  student_username: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: string;
  status: string;
  dob: string | null;
  last_login: string;
}

interface Classroom {
  classroom_id: string;
  classroom_name: string;
  instructor: Instructor;
  total_students: number;
}

interface Instructor {
  instructor_id: string;
  instructor_fullname: string;  
  instructor_username: string;
  instructor_avatar_url: string | null;
}
```

**Use Cases:**
- ✅ Class lists
- ✅ Student lists
- ✅ User profiles
- ✅ Assignment tracking

---

## 🛠️ Utility Functions

### parseQuizAttempt()
Transforms raw `QuizAttempt` to enriched `ParsedQuiz` with computed fields.

```typescript
import { parseQuizAttempt } from '@core/types/dashboard.types';

const parsed = parseQuizAttempt(attempt, 'Math Class 101');
// Returns ParsedQuiz with question_count, is_overdue, days_until_due, etc.
```

### Helper Functions

```typescript
// Type guards
isCompletedAttempt(attempt: QuizAttempt): boolean
isQuizOverdue(endTime: string, status: AttemptStatus): boolean

// Data extraction
getQuestionCount(questions: QuizQuestionsData): number
getCorrectAnswersCount(submission?: QuizSubmission): number
getDaysUntilDue(endTime: string): number
```

---

## 📦 How to Use in Components

### ✅ CORRECT - Import from Unified Types

```typescript
// StudentDashboard.tsx
import {
  QuizAttempt,
  ParsedQuiz,
  DashboardStats,
  parseQuizAttempt,
} from '@core/types/dashboard.types';

// OR from centralized index
import {
  QuizAttempt,
  ParsedQuiz,
  DashboardStats,
} from '@core/types';
```

### ❌ WRONG - Local Interface Definition

```typescript
// DON'T DO THIS
interface StudentAttempt {
  quiz_id: number;
  score: number;
  // ... duplicating types
}
```

### Example: Using in Components

```typescript
// Student Dashboard
const [stats, setStats] = useState<DashboardStats>({
  total_quizzes: 0,
  completed_count: 0,
  pending_count: 0,
  missed_count: 0,
  average_score: 0,
  total_time_spent: 0,
  total_questions_attempted: 0,
});

const [quizzes, setQuizzes] = useState<ParsedQuiz[]>([]);

// Parse API response
const attemptsArray = JSON.parse(data[0].attempts) as QuizAttempt[];
const parsed = attemptsArray.map(attempt => 
  parseQuizAttempt(attempt, data[0].classroom_name)
);
setQuizzes(parsed);
```

---

## 🔄 Migration Guide

### Step 1: Remove Local Interfaces
Delete any local type definitions that duplicate the unified types.

**Before:**
```typescript
// Component file
interface StudentAttempt { ... }
interface ParsedQuiz { ... }
```

**After:**
```typescript
import { QuizAttempt, ParsedQuiz } from '@core/types/dashboard.types';
```

### Step 2: Use Utility Functions
Replace manual calculations with utility functions.

**Before:**
```typescript
const questionCount = attempt.questions?.quizzes?.length || 0;
const isOverdue = new Date() > new Date(attempt.end_time) && attempt.status === 'pending';
```

**After:**
```typescript
const parsed = parseQuizAttempt(attempt, classroomName);
// parsed.question_count, parsed.is_overdue automatically calculated
```

### Step 3: Standardize Stats
Use `DashboardStats` for all dashboard statistics.

**Before:**
```typescript
interface StudentStats {
  total_quizzes: number;
  completed_count: number;
  // ...
}
```

**After:**
```typescript
import { DashboardStats } from '@core/types/dashboard.types';

const [stats, setStats] = useState<DashboardStats>({ ... });
```

---

## 📊 Type Hierarchy

```
DashboardViewType
    ↓
DashboardApiResponse<T>
    ↓
    ├─→ QuizAttempt[] (from API)
    │       ↓
    │   parseQuizAttempt()
    │       ↓
    │   ParsedQuiz (for display)
    │
    └─→ DashboardStats (calculated)
```

---

## 🎨 UI Differences (Same Data, Different Display)

### Teacher View
```typescript
// Uses QuizAttempt
quizzes.map(quiz => (
  <TeacherQuizCard
    attempts={quiz.attempts}  // Shows all student attempts
    totalStudents={quiz.total_students}
    pendingCount={quiz.pending_count}
  />
))
```

### Student View
```typescript
// Uses same QuizAttempt structure
quizzes.map(quiz => (
  <StudentQuizCard
    status={quiz.status}      // Shows only own status
    score={quiz.score}
    isOverdue={quiz.is_overdue}
  />
))
```

**Key Point:** Same `QuizAttempt` type, different UI components and filtering.

---

## ✅ Benefits of Unified System

1. **Single Source of Truth** - No duplicate type definitions
2. **Easier Maintenance** - Update once, applies everywhere
3. **Type Safety** - TypeScript catches mismatches across components
4. **Consistent Data Flow** - API → QuizAttempt → ParsedQuiz → UI
5. **Reusable Utilities** - Shared helper functions for common tasks
6. **Better Developer Experience** - Clear imports, autocomplete works everywhere

---

## 🚨 Important Rules

1. **NEVER** define quiz/attempt/student interfaces in component files
2. **ALWAYS** import from `@core/types/dashboard.types` or `@core/types`
3. **USE** utility functions (`parseQuizAttempt`, etc.) instead of manual parsing
4. **KEEP** API response types in `quiz.types.ts` (BaseQuiz, etc.)
5. **SEPARATE** data structure (types) from presentation (components)

---

## 📝 Quick Reference

| Need | Import |
|------|--------|
| Quiz attempt data | `QuizAttempt` |
| Display quiz in UI | `ParsedQuiz` |
| Dashboard statistics | `DashboardStats` |
| Student information | `Student` |
| Classroom information | `Classroom` |
| Parse quiz data | `parseQuizAttempt()` |
| Check if overdue | `isQuizOverdue()` |
| Get question count | `getQuestionCount()` |

---

## 🔍 Examples in Codebase

**Already Migrated:**
- ✅ `src/screens/StudentDashboard.tsx` - Uses unified types
- ✅ `src/core/services/dashboardApi.ts` - Returns unified types
- ✅ `src/core/types/quiz.types.ts` - Imports from dashboard.types.ts

**To Be Migrated (Future):**
- 🔲 Other quiz screens
- 🔲 Teacher dashboard components
- 🔲 Assessment screens

---

## 💡 Best Practices

1. **Import from index.ts for convenience:**
   ```typescript
   import { QuizAttempt, ParsedQuiz, DashboardStats } from '@core/types';
   ```

2. **Use utility functions for transformations:**
   ```typescript
   const parsed = parseQuizAttempt(attempt, classroomName);
   ```

3. **Keep type definitions in one place:**
   - ✅ Add new quiz-related types to `dashboard.types.ts`
   - ❌ Don't create new type files

4. **Document shared fields in comments:**
   ```typescript
   interface MyComponent {
     quiz: ParsedQuiz; // Shared type - used by teacher & student views
   }
   ```

---

## 🎓 Summary

The unified type system ensures:
- **Consistency** across teacher and student views
- **Maintainability** with single source of truth
- **Type safety** with TypeScript
- **Reduced duplication** of code
- **Easier onboarding** for new developers

**Remember:** Data structure is universal, only the UI presentation differs!
