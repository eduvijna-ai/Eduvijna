# 🚀 UNIFIED TYPE SYSTEM - QUICK START

## 📥 Import Types

```typescript
// Option 1: From centralized index (RECOMMENDED)
import {
  QuizAttempt,
  ParsedQuiz,
  DashboardStats,
  Student,
  Classroom,
  parseQuizAttempt,
} from '@core/types';

// Option 2: Direct from dashboard types
import {
  QuizAttempt,
  ParsedQuiz,
  DashboardStats,
} from '@core/types/dashboard.types';
```

---

## 🎯 Common Use Cases

### 1. Display Quiz List (Student or Teacher)

```typescript
const [quizzes, setQuizzes] = useState<ParsedQuiz[]>([]);

// Parse API response
const attemptsArray = JSON.parse(apiData.attempts) as QuizAttempt[];
const parsed = attemptsArray.map(attempt => 
  parseQuizAttempt(attempt, apiData.classroom_name)
);
setQuizzes(parsed);

// Render
{quizzes.map(quiz => (
  <QuizCard
    questionCount={quiz.question_count}
    isOverdue={quiz.is_overdue}
    score={quiz.score}
    status={quiz.status}
  />
))}
```

### 2. Dashboard Statistics

```typescript
const [stats, setStats] = useState<DashboardStats>({
  total_quizzes: 0,
  completed_count: 0,
  pending_count: 0,
  missed_count: 0,
  average_score: 0,
  total_time_spent: 0,
  total_questions_attempted: 0,
});

// Calculate from attempts
const completed = attempts.filter(a => a.status === 'completed');
const avgScore = completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length;

setStats({
  total_quizzes: attempts.length,
  completed_count: completed.length,
  average_score: Math.round(avgScore),
  // ...
});
```

### 3. Check Quiz Status

```typescript
import { isQuizOverdue, isCompletedAttempt } from '@core/types/dashboard.types';

if (isQuizOverdue(quiz.end_time, quiz.status)) {
  // Show overdue badge
}

if (isCompletedAttempt(attempt)) {
  // Show score and completion date
}
```

### 4. Get Quiz Details

```typescript
import { getQuestionCount, getCorrectAnswersCount } from '@core/types/dashboard.types';

const questionCount = getQuestionCount(attempt.questions);
const correctAnswers = getCorrectAnswersCount(attempt.submission);

console.log(`${correctAnswers}/${questionCount} correct`);
```

---

## 🔄 Data Flow

```
API Response
    ↓
QuizAttempt[] (raw data)
    ↓
parseQuizAttempt() (transform)
    ↓
ParsedQuiz[] (enriched for display)
    ↓
UI Components
```

---

## ✅ DO's

```typescript
✅ import { QuizAttempt } from '@core/types';
✅ const parsed = parseQuizAttempt(attempt, 'Class Name');
✅ const [stats, setStats] = useState<DashboardStats>({ ... });
✅ const questionCount = getQuestionCount(attempt.questions);
```

## ❌ DON'Ts

```typescript
❌ interface StudentAttempt { ... }  // Don't define locally
❌ const questionCount = attempt.questions?.quizzes?.length || 0;  // Use utility
❌ const isOverdue = new Date() > new Date(attempt.end_time);  // Use utility
❌ import from component files  // Import from @core/types
```

---

## 📊 Type Cheat Sheet

| Type | Use For |
|------|---------|
| `QuizAttempt` | Raw API data, quiz attempts |
| `ParsedQuiz` | Display in lists, cards, dashboards |
| `DashboardStats` | Summary statistics |
| `Student` | Student information anywhere |
| `Classroom` | Classroom data anywhere |
| `QuizQuestion` | Individual quiz questions |
| `QuizSubmission` | Submission details |
| `AttemptStatus` | `'pending' \| 'in_progress' \| 'completed' \| 'missed'` |

---

## 🎨 Teacher vs Student - Same Types, Different UI

```typescript
// SAME TYPE DEFINITION
interface QuizAttempt {
  quiz_id: number;
  status: AttemptStatus;
  score: number | null;
  // ...
}

// TEACHER VIEW - Shows all students' attempts
<TeacherQuizList>
  {quiz.attempts.map(attempt => (
    <AttemptRow student={attempt.student_fullname} score={attempt.score} />
  ))}
</TeacherQuizList>

// STUDENT VIEW - Shows only own attempt
<StudentQuizCard>
  Status: {attempt.status}
  Score: {attempt.score}
</StudentQuizCard>
```

---

## 🛠️ Utility Functions Reference

```typescript
// Transform attempt to parsed quiz
parseQuizAttempt(attempt: QuizAttempt, classroomName: string): ParsedQuiz

// Type guards
isCompletedAttempt(attempt: QuizAttempt): boolean
isQuizOverdue(endTime: string, status: AttemptStatus): boolean

// Data extraction
getQuestionCount(questions: QuizQuestionsData): number
getCorrectAnswersCount(submission?: QuizSubmission): number
getDaysUntilDue(endTime: string): number
```

---

## 📁 File Locations

```
src/core/types/
├── dashboard.types.ts    ← All core types + utilities
├── quiz.types.ts         ← API types + re-exports
└── index.ts              ← Centralized exports
```

---

## 🔍 When to Use Which

| Scenario | Type to Use |
|----------|-------------|
| Receiving API response | `QuizAttempt` |
| Storing in state for display | `ParsedQuiz` |
| Dashboard summary cards | `DashboardStats` |
| Student profile | `Student` |
| Class selector | `Classroom` |
| Quiz taking screen | `QuizQuestion` |

---

## 💡 Remember

1. **One structure for all** - Teacher and student use same types
2. **Import from @core/types** - Always use centralized imports
3. **Use utilities** - Don't manually calculate derived fields
4. **ParsedQuiz for UI** - Transform QuizAttempt → ParsedQuiz for display

---

**Read full guide:** [UNIFIED_TYPE_SYSTEM.md](./UNIFIED_TYPE_SYSTEM.md)
