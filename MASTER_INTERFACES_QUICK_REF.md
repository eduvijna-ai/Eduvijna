# 🚀 MASTER INTERFACES - QUICK REFERENCE

## 📥 Import Master Interfaces

```typescript
// Option 1: From centralized dashboard types (RECOMMENDED)
import {
  UserProfile,
  StudentProfile,
  QuizAttempt,
  ParsedQuiz,
  Classroom,
  DashboardStats,
  isStudent,
  isInstructor,
  getDisplayName,
} from '@core/types/dashboard.types';

// Option 2: From centralized index
import {
  UserProfile,
  QuizAttempt,
  ParsedQuiz,
} from '@core/types';
```

---

## 🎯 Master Interfaces Cheat Sheet

| Domain | Interface | Use For |
|--------|-----------|---------|
| **User** | `UserProfile` | All user data (student, instructor, admin) |
| **Student API** | `StudentProfile` | Legacy API responses with student_id |
| **Quiz Attempt** | `QuizAttempt` | All quiz attempts (teacher & student view) |
| **Quiz Display** | `ParsedQuiz` | UI display with computed fields |
| **Classroom** | `Classroom` | Class/classroom information |
| **Statistics** | `DashboardStats` | Dashboard summaries (teacher & student) |

---

## 📋 Common Use Cases

### 1. User Profile (Any Role)

```typescript
import { UserProfile, getDisplayName, isStudent } from '@core/types/dashboard.types';

// Component
interface ProfileProps {
  user: UserProfile; // ✅ Works for all roles
}

// Usage
const displayName = getDisplayName(user);
if (isStudent(user)) {
  // Show student-specific UI
}
```

### 2. Student List (Teacher View)

```typescript
import { UserProfile, toStudentProfile } from '@core/types/dashboard.types';

// Get students
const students: UserProfile[] = await fetchStudents();

// Convert if API needs StudentProfile format
const studentProfiles = students.map(toStudentProfile);
```

### 3. API Response Handling

```typescript
import { UserProfile } from '@core/types/dashboard.types';

// No mapping needed!
const user = await get<UserProfile>('/api/v1/auth/profile');
console.log(getDisplayName(user));
```

### 4. Role-Based Rendering

```typescript
import { UserProfile, isStudent, isInstructor, isAdmin } from '@core/types/dashboard.types';

function DashboardRouter({ user }: { user: UserProfile }) {
  if (isStudent(user)) return <StudentDashboard />;
  if (isInstructor(user)) return <TeacherDashboard />;
  if (isAdmin(user)) return <AdminDashboard />;
}
```

---

## 🔧 Utility Functions

### UserProfile Utilities

```typescript
// Type Guards
isStudent(user) → boolean
isInstructor(user) → boolean  
isAdmin(user) → boolean
isActiveUser(user) → boolean

// Helpers
getDisplayName(user) → string  // Returns full_name or username

// Conversions
toStudentProfile(user) → StudentProfile
fromStudentProfile(student) → UserProfile
```

### QuizAttempt Utilities

```typescript
// Type Guards
isCompletedAttempt(attempt) → boolean
isQuizOverdue(endTime, status) → boolean

// Data Extraction
getQuestionCount(questions) → number
getCorrectAnswersCount(submission) → number
getDaysUntilDue(endTime) → number

// Transform
parseQuizAttempt(attempt, classroomName) → ParsedQuiz
```

---

## ✅ DO's

```typescript
✅ import { UserProfile } from '@core/types/dashboard.types';
✅ interface Props { user: UserProfile }
✅ const displayName = getDisplayName(user);
✅ if (isStudent(user)) { /* ... */ }
✅ Use optional fields: grade_id?: number
```

## ❌ DON'Ts

```typescript
❌ interface StudentUser { ... }  // Don't create role-specific types
❌ interface TeacherUser { ... }  // Use UserProfile with optional fields
❌ const name = user.full_name || user.username;  // Use getDisplayName()
❌ const isStudentRole = user.role === 'student';  // Use isStudent()
```

---

## 🔄 Quick Migration

### Before (Multiple Interfaces)

```typescript
// ❌ Old way - duplicated interfaces
interface User { id: string; name: string; }
interface Student { student_id: number; student_name: string; }
interface Teacher { teacher_id: string; teacher_name: string; }

// Manual mapping
function mapUser(data: any): User {
  return { id: data.id, name: data.full_name || data.username };
}
```

### After (Master Interface)

```typescript
// ✅ New way - one master interface
import { UserProfile, getDisplayName } from '@core/types/dashboard.types';

// No mapping needed
const user: UserProfile = await fetchUser();
const name = getDisplayName(user);
```

---

## 📊 Interface Structure

### UserProfile Fields

```typescript
// Core (required)
id: string
username: string
email: string
role: 'student' | 'instructor' | 'admin'
full_name: string | null
is_active: boolean
is_verified: boolean
created_at: string

// Optional (role-specific or nullable)
name?: string                    // Computed display name
bio?: string | null             // User description
phone?: string | null           // Contact number
avatar_url?: string | null      // Profile picture
school?: string | null          // Institution
grade_id?: number | null        // Student grade
board_id?: number | null        // Student board
date_of_birth?: string | null   // DOB
address?: string | null         // Physical address
```

---

## 🎨 Examples by Use Case

### Profile Screen

```typescript
import { UserProfile, getDisplayName } from '@core/types/dashboard.types';

function ProfileScreen({ user }: { user: UserProfile }) {
  return (
    <View>
      <Text>{getDisplayName(user)}</Text>
      <Text>{user.email}</Text>
      {user.school && <Text>School: {user.school}</Text>}
      {user.grade_id && <Text>Grade: {user.grade_id}</Text>}
    </View>
  );
}
```

### Student List (Teacher)

```typescript
import { UserProfile, isStudent, getDisplayName } from '@core/types/dashboard.types';

function StudentList({ users }: { users: UserProfile[] }) {
  const students = users.filter(isStudent);
  
  return students.map(student => (
    <StudentCard
      key={student.id}
      name={getDisplayName(student)}
      email={student.email}
      grade={student.grade_id}
    />
  ));
}
```

### Auth Context

```typescript
import { UserProfile } from '@core/types/dashboard.types';

interface AuthContextType {
  user: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;
}
```

---

## 🔍 Field Mapping Reference

| UserProfile | StudentProfile | Old User | API Response |
|-------------|----------------|----------|--------------|
| `id` | `student_id.toString()` | `id` | `id` |
| `full_name` | `student_fullname` | `full_name` | `full_name` |
| `username` | `student_username` | `username` | `username` |
| `email` | `email` | `email` | `email` |
| `avatar_url` | `avatar_url` | `avatar_url` | `avatar_url` |
| `date_of_birth` | `dob` | `date_of_birth` | `date_of_birth` |

---

## 💡 Pro Tips

1. **Always use utility functions:**
   ```typescript
   ✅ getDisplayName(user)
   ❌ user.full_name || user.username
   ```

2. **Type guards for role checks:**
   ```typescript
   ✅ if (isStudent(user))
   ❌ if (user.role === 'student')
   ```

3. **Optional chaining for nullable fields:**
   ```typescript
   ✅ user.school ?? 'No school'
   ✅ user.grade_id ? `Grade ${user.grade_id}` : 'N/A'
   ```

4. **Conversion utilities when needed:**
   ```typescript
   // API returns StudentProfile format
   const studentData: StudentProfile = await fetchStudent();
   const user = fromStudentProfile(studentData);
   ```

---

## 🚨 Common Mistakes to Avoid

```typescript
// ❌ Creating role-specific interfaces
interface StudentData { ... }
interface TeacherData { ... }

// ✅ Use master interface with optional fields
interface UserProfile {
  grade_id?: number; // Student-specific
  department?: string; // Teacher-specific
}

// ❌ Manual name resolution
const name = user.full_name || user.username;

// ✅ Use utility function
const name = getDisplayName(user);

// ❌ Hardcoded role checks
if (user.role === 'student') { ... }

// ✅ Use type guard
if (isStudent(user)) { ... }
```

---

## 📍 File Locations

```
src/core/types/
├── dashboard.types.ts    ← Master interfaces + utilities
├── quiz.types.ts         ← Quiz-specific types
└── index.ts              ← Centralized exports

src/core/api/
└── profile.api.ts        ← Uses UserProfile
```

---

## 📚 Full Documentation

- **Complete Guide**: [MASTER_INTERFACE_PATTERN.md](./MASTER_INTERFACE_PATTERN.md)
- **Type System**: [UNIFIED_TYPE_SYSTEM.md](./UNIFIED_TYPE_SYSTEM.md)
- **Quick Start**: [TYPE_SYSTEM_QUICK_START.md](./TYPE_SYSTEM_QUICK_START.md)

---

**Remember:** One master interface per domain, optional fields for variations!
