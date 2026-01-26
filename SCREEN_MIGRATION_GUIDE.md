# Screen Component Update Guide

## Quick Reference for Migrating to New Hooks

### 1. Student Dashboard Migration

#### OLD CODE (Remove):
```typescript
import { useStudentDashboard } from '../core/hooks/useStudentDashboard.old';

const { 
  quizzes,      // All quizzes mixed together
  loading, 
  error, 
  refresh 
} = useStudentDashboard();

// Manual filtering
const activeQuizzes = quizzes.filter(q => q.status === 'active');
const completedQuizzes = quizzes.filter(q => q.status === 'completed');
```

#### NEW CODE (Use):
```typescript
import { useStudentDashboard } from '../core/hooks/useStudentDashboard';

const {
  allQuizzes,          // Full dataset
  pendingQuizzes,      // Auto-filtered
  completedQuizzes,    // Auto-filtered
  missedQuizzes,       // Auto-filtered
  activeQuizzes,       // Auto-filtered
  upcomingQuizzes,     // Auto-filtered
  loading,
  error,
  getQuizById,         // NEW: Get quiz by ID
  getQuizzesByStatus,  // NEW: Get quizzes by custom status
  refresh,             // Force refresh
} = useStudentDashboard();

// Use filtered views directly - no manual filtering needed
<FlatList data={pendingQuizzes} ... />
<FlatList data={completedQuizzes} ... />

// Get specific quiz
const quiz = getQuizById(quizId);

// Get quizzes by custom status
const customQuizzes = getQuizzesByStatus('custom_status');
```

---

### 2. Teacher Dashboard Migration

#### OLD CODE (Remove):
```typescript
import { useTeacherDashboard } from '../core/hooks/useTeacherDashboard.old';

const {
  quizzes,
  students,      // Preloaded students
  classrooms,
  loading,
  refresh,
  allStudents,   // REMOVED
  loadMore,      // REMOVED
  hasMore,       // REMOVED
} = useTeacherDashboard();

// Students were preloaded
<StudentList students={allStudents} />
```

#### NEW CODE (Use):
```typescript
import { useTeacherDashboard } from '../core/hooks/useTeacherDashboard';

const {
  allQuizzes,                    // All quizzes from summary
  classrooms,                    // Classroom list
  stats,                         // Dashboard statistics (NEW)
  weakStudents,                  // Weak students (NEW)
  recentAssessments,             // Recent assessments (NEW)
  studentListsCache,             // Cached student lists (NEW)
  loading,
  error,
  getQuizById,                   // NEW: Get quiz by ID
  getQuizzesByClassroom,         // NEW: Get quizzes for classroom
  loadStudentListForClass,       // NEW: Load students on-demand
  refresh,
} = useTeacherDashboard();

// Use derived data directly
<StatsCard {...stats} />
<WeakStudentsList students={weakStudents} />
<RecentAssessments quizzes={recentAssessments} />

// Load students ON-DEMAND only
const handleClassroomPress = async (classroomId: string) => {
  const students = await loadStudentListForClass(classroomId);
  navigation.navigate('StudentList', { 
    classroomId, 
    students 
  });
};

// Get quizzes for specific classroom
const classroomQuizzes = getQuizzesByClassroom(classroomId);
```

---

### 3. StudentList.tsx Migration

#### OLD CODE:
```typescript
// Students were passed as prop (preloaded)
function StudentList({ studentsData }) {
  // ...
}
```

#### NEW CODE:
```typescript
// Students loaded on-demand from teacher dashboard
function StudentList({ navigation, route }) {
  const { classroomId } = route.params;
  const { loadStudentListForClass, studentListsCache } = useTeacherDashboard();
  
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  
  useEffect(() => {
    const loadStudents = async () => {
      // Check cache first
      const cached = studentListsCache[classroomId];
      if (cached) {
        setStudents(cached);
        return;
      }
      
      // Load from API
      setLoading(true);
      try {
        const data = await loadStudentListForClass(classroomId);
        setStudents(data);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStudents();
  }, [classroomId, loadStudentListForClass, studentListsCache]);
  
  return (
    <FlatList 
      data={students}
      loading={loading}
      // ...
    />
  );
}
```

---

### 4. Assessments.tsx Migration

#### OLD CODE:
```typescript
import { useAssessments } from '../core/hooks/useAssessments';

const { 
  assessments,   // Mixed teacher/student data
  loading 
} = useAssessments();
```

#### NEW CODE:
```typescript
import { useUserStore } from '../core/store/user.store';
import { useStudentDashboard } from '../core/hooks/useStudentDashboard';
import { useTeacherDashboard } from '../core/hooks/useTeacherDashboard';

const { user } = useUserStore();
const isStudent = user?.role === 'student';

// Student view
const studentDashboard = useStudentDashboard();

// Teacher view
const teacherDashboard = useTeacherDashboard();

// Use role-specific data
const assessments = isStudent 
  ? studentDashboard.allQuizzes 
  : teacherDashboard.allQuizzes;

const loading = isStudent 
  ? studentDashboard.loading 
  : teacherDashboard.loading;
```

---

### 5. Dropdown Loading Pattern

#### OLD CODE (Remove):
```typescript
import { fetchClasses, fetchAllSubjects, fetchLevels } from '../core/services/dropdown';

// On screen mount - preloading
useEffect(() => {
  fetchClasses();    // Cached globally
  fetchAllSubjects(); // Cached globally
  fetchLevels();      // Cached globally
}, []);
```

#### NEW CODE (Use):
```typescript
import { getClasses, getSubjects, getDifficultyLevels } from '../core/services/dropdown';

// Load ONLY when screen opens
const [classes, setClasses] = useState([]);
const [subjects, setSubjects] = useState([]);
const [levels, setLevels] = useState([]);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const loadDropdowns = async () => {
    setLoading(true);
    try {
      // Direct API calls - no caching
      const [classData, levelData] = await Promise.all([
        getClasses(),
        getDifficultyLevels(),
      ]);
      setClasses(classData);
      setLevels(levelData);
    } catch (error) {
      console.error('Failed to load dropdowns:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Only load when screen opens
  loadDropdowns();
}, []); // Empty deps - load once per mount

// Load subjects when class selected
const handleClassChange = async (classId: string) => {
  try {
    const subjectData = await getSubjects(classId);
    setSubjects(subjectData);
  } catch (error) {
    console.error('Failed to load subjects:', error);
  }
};
```

---

## Common Patterns

### Pattern 1: Check if data already loaded
```typescript
const { allQuizzes, loading, lastFetched } = useStudentDashboard();

// Data already loaded?
if (allQuizzes.length > 0 && !loading) {
  // Use cached data
  return <QuizList quizzes={allQuizzes} />;
}

// Loading...
return <LoadingSpinner />;
```

### Pattern 2: Force refresh on user action
```typescript
const { refresh, loading } = useStudentDashboard();

const handleRefresh = async () => {
  try {
    await refresh();
    // Data reloaded
  } catch (error) {
    console.error('Refresh failed:', error);
  }
};

<RefreshControl 
  refreshing={loading}
  onRefresh={handleRefresh}
/>
```

### Pattern 3: Navigate with data
```typescript
const { getQuizById } = useStudentDashboard();

const handleQuizPress = (quizId: string) => {
  const quiz = getQuizById(quizId);
  
  if (!quiz) {
    console.error('Quiz not found');
    return;
  }
  
  navigation.navigate('QuizDetail', { 
    quizId,
    quiz, // Pass full quiz object
  });
};
```

### Pattern 4: Filter data locally
```typescript
const { allQuizzes } = useTeacherDashboard();
const [selectedSubject, setSelectedSubject] = useState('all');

// Filter in component
const filteredQuizzes = selectedSubject === 'all'
  ? allQuizzes
  : allQuizzes.filter(q => q.subject === selectedSubject);

<FlatList data={filteredQuizzes} ... />
```

---

## Error Handling

### Handle Loading States:
```typescript
const { loading, error, allQuizzes } = useStudentDashboard();

if (loading && allQuizzes.length === 0) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorView message={error} onRetry={refresh} />;
}

if (allQuizzes.length === 0) {
  return <EmptyState message="No quizzes available" />;
}

return <QuizList quizzes={allQuizzes} />;
```

### Handle API Errors:
```typescript
const { loadStudentListForClass } = useTeacherDashboard();

const loadStudents = async (classroomId: string) => {
  try {
    const students = await loadStudentListForClass(classroomId);
    // Success
    return students;
  } catch (error) {
    // API error
    console.error('Failed to load students:', error);
    Alert.alert('Error', 'Failed to load student list');
    return [];
  }
};
```

---

## Migration Checklist

### For Each Screen Component:

- [ ] Import new hook (not .old version)
- [ ] Remove unused properties from hook destructuring
- [ ] Update to use new filtered views (pendingQuizzes, etc.)
- [ ] Replace manual filtering with hook-provided data
- [ ] Use getQuizById() instead of array.find()
- [ ] Update loading/error handling
- [ ] Test with both roles (student/teacher)
- [ ] Remove any caching logic
- [ ] Remove any manual API calls
- [ ] Verify no duplicate API calls (check network tab)

---

## Files to Update (Priority Order)

1. **TeacherDashboard.tsx** - Remove allStudents, loadMore, hasMore
2. **StudentDashboard.tsx** - Use new filtered views
3. **StudentList.tsx** - Load students on-demand
4. **Assessments.tsx** - Split student/teacher logic
5. **ClassesList.tsx** - Update classroom navigation
6. **CreateAIQuizScreen.tsx** - Update dropdown loading
7. **CreateDocumentQuizScreen.tsx** - Update dropdown loading
8. **CreateImageQuizScreen.tsx** - Update dropdown loading
9. **CreateYouTubeQuizScreen.tsx** - Update dropdown loading

---

## Testing After Migration

### Student Flow:
1. Login as student
2. Dashboard loads (check network: 1 API call with view_type=student_details)
3. Switch tabs (check network: 0 new API calls)
4. Click quiz (data from memory)
5. Pull to refresh (check network: 1 new API call)

### Teacher Flow:
1. Login as teacher
2. Dashboard loads (check network: 1 API call with view_type=summary)
3. View stats (data from memory)
4. Click classroom (check network: 1 API call with view_type=class_wise_students)
5. Click same classroom again (check network: 0 new API calls - cached)
6. Open Create Assessment (check network: dropdown APIs load)

---

## Quick Fix Errors

### Error: "Property 'allStudents' does not exist"
**File**: TeacherDashboard.tsx
**Fix**: Remove `allStudents` - use `loadStudentListForClass()` instead

### Error: "Property 'loadMore' does not exist"
**File**: TeacherDashboard.tsx
**Fix**: Remove pagination - all data loads in single API call

### Error: "Property 'total_questions' does not exist"
**File**: assessment.api.ts
**Fix**: Use `question_count` (correct field name)

### Error: Type mismatch in filtered arrays
**File**: useAssessments.ts
**Fix**: This hook may be obsolete - use role-specific hooks instead

---

**Ready to Start**: Update TeacherDashboard.tsx first (has most errors)
