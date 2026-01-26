# Dashboard API Usage Guide

## Updated API Structure (January 2026)

All dashboard data comes from a **single endpoint**: `/api/v1/dashboard/quizzes`

### Parameters
- `view_type` - Determines what data is returned
- `classroom_id` - Optional: filter by specific classroom
- `quiz_id` - Optional: filter by specific quiz
- `limit` - Pagination limit (default: 10 for lists, 100 for summary)
- `offset` - Pagination offset (default: 0)
- `start_date` - Optional: filter by date range
- `end_date` - Optional: filter by date range

---

## Teacher Use Cases

### 1. Dashboard & Analytics (Call ONCE on app load)
Get all teacher statistics with students, quizzes count and details:

```typescript
fetchTeacherDashboardSummary()
// Params: view_type=summary, limit=100, offset=0
// Returns: All quizzes with counts, statuses, student counts
```

**Response includes:**
- All quizzes with availability_status (active, expired, available_soon)
- Student counts per quiz (total_students, pending_count, in_progress_count, completed_count)
- Quiz details (name, topic, duration, dates, etc.)

---

### 2. Classes List
Get all classrooms with student lists and counts:

```typescript
fetchTeacherClassrooms()
// Params: view_type=class_wise_students, limit=100, offset=0
// Returns: Classrooms with student lists in 'attempts' field
```

**Response includes:**
- `classroom_id`, `classroom_name`
- `total_count` - total students in classroom
- `attempts` - JSON array of student objects with details

---

### 3. Class-Specific Quizzes
Get quizzes for a specific classroom:

```typescript
fetchClassroomQuizzes(classroomId)
// Params: view_type=summary, classroom_id=class_7faf5c26, limit=10, offset=0
// Returns: All quizzes for the specified classroom
```

---

### 4. Class-Specific Quizzes with All Student Statuses
Get quizzes with detailed student status breakdown (completed, pending, missed):

```typescript
fetchClassroomQuizzesWithAllStatuses(classroomId)
// Params: view_type=all, classroom_id=class_7faf5c26, limit=10, offset=0
// Returns: Quizzes with all student statuses
```

---

### 5. Specific Quiz Details
Get details for a specific quiz in a classroom:

```typescript
fetchQuizDetails(classroomId, quizId)
// Params: view_type=summary, classroom_id=class_7faf5c26, quiz_id=5, limit=10, offset=0
// Returns: Single quiz with full details
```

---

### 6. Quiz with All Student Statuses
Get specific quiz with all student status details:

```typescript
fetchQuizzesWithAllStatuses({ classroom_id: classroomId, quiz_id: quizId })
// Params: view_type=all, classroom_id=class_7faf5c26, quiz_id=5, limit=10, offset=0
// Returns: Single quiz with all student statuses (completed, pending, missed)
```

---

## Student Use Cases

### 1. Student Dashboard Quizzes
Get all quizzes for the logged-in student:

```typescript
fetchStudentQuizzes()
// Params: view_type=student_details, limit=100, offset=0
// Returns: All quizzes assigned to the student
```

**Response includes:**
- Quiz details with student-specific data
- `student_status` - pending, in_progress, completed, missed
- `availability_status` - active, expired, available_soon
- Score information (best_score, latest_score, avg_score)
- Attempt information

---

## Important Notes

### ✅ DO:
- Call `fetchTeacherDashboardSummary()` **once** on dashboard load
- Use `classroom_id` parameter to filter by classroom
- Use `quiz_id` parameter to get specific quiz details
- Use `view_type=all` to get student status breakdowns
- Use `view_type=class_wise_students` to get classroom student lists

### ❌ DON'T:
- Don't apply automatic date filtering (removed from defaults)
- Don't use old view_types: `attempts`, `missed`, `classes`, `all_students`
- Don't make multiple API calls for data already in dashboard summary
- Don't use `created_from`/`created_to` (use `start_date`/`end_date` if needed)

---

## Response Structure

All responses follow this structure:

```typescript
{
  meta: {
    total_count: number,
    limit: number,
    offset: number,
    view_type: string
  },
  data: Array<Quiz>
}
```

---

## View Types

| View Type | Purpose |
|-----------|---------|
| `summary` | Teacher: All quizzes with counts and statuses |
| `all` | Teacher: Quizzes with all student statuses (completed, pending, missed) |
| `class_wise_students` | Teacher: Classrooms with student lists |
| `student_details` | Student: Dashboard quizzes |

---

## Migration from Old API

### Old Functions → New Functions

| Old | New |
|-----|-----|
| `fetchMissedQuizzes()` | `fetchQuizzesWithAllStatuses()` with view_type=all |
| `fetchQuizAttempts()` | `fetchQuizzesWithAllStatuses()` with view_type=all |
| `fetchAllStudents()` | `fetchTeacherClassrooms()` (data in attempts field) |
| `fetchClassroomStudents(id)` | `fetchTeacherClassrooms()` filtered client-side |

### Removed Parameters
- `created_from` / `created_to` → use `start_date` / `end_date` (optional)
- `assigned_from` / `assigned_to` → removed
- `started_from` / `started_to` → removed
- `completed_from` / `completed_to` → removed
- `attempt_status` → use `view_type=all` instead
- `min_score` / `max_score` → filter client-side
- `min_duration` / `max_duration` → filter client-side
