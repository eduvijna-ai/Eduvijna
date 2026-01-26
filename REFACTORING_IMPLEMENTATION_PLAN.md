# Complete Application Refactoring Plan

## 🎯 Goal
Redesign EduVijna application flow for optimal performance with:
- Login-first architecture
- Single API source per screen
- No caching libraries
- Strict student/teacher separation
- In-memory state management

---

## ✅ COMPLETED

### 1. Authentication Flow ✅
- **File**: `src/core/hooks/useAuth.ts`
- **Changes**:
  - ✅ Removed automatic data loading on login
  - ✅ Removed automatic data loading on checkAuth
  - ✅ Removed dataLoader import and calls
  - ✅ No background API calls before authentication
  
### 2. Auth Context ✅  
- **File**: `src/core/context/AuthContext.tsx`
- **Changes**:
  - ✅ Never returns null (doesn't block rendering)
  - ✅ Shows login screen when not authenticated
  - ✅ No automatic redirects

---

## 🚧 IN PROGRESS

### 3. New Dashboard Hooks Created ✅
- **Files Created**:
  - `src/core/hooks/useStudentDashboard.new.ts` ✅
  - `src/core/hooks/useTeacherDashboard.new.ts` ✅

**Student Hook Features**:
- ✅ Single API call: `view_type=student_details`
- ✅ Stores all data in memory (`allQuizzes` state)
- ✅ Prevents re-fetching if data exists
- ✅ Derives all views from single source
- ✅ No caching libraries

**Teacher Hook Features**:
- ✅ Dashboard API: `view_type=summary` (once)
- ✅ Student lists: `view_type=class_wise_students` (on-demand only)
- ✅ Never preloads student data
- ✅ Caches student lists after first load
- ✅ Strict separation from student logic

---

## 📋 TODO

### 4. Replace Old Hooks with New Ones
**Action Items**:
```bash
# Backup old files
mv src/core/hooks/useStudentDashboard.ts src/core/hooks/useStudentDashboard.old.ts
mv src/core/hooks/useTeacherDashboard.ts src/core/hooks/useTeacherDashboard.old.ts

# Activate new files
mv src/core/hooks/useStudentDashboard.new.ts src/core/hooks/useStudentDashboard.ts
mv src/core/hooks/useTeacherDashboard.new.ts src/core/hooks/useTeacherDashboard.ts
```

### 5. Update Dropdown Loading Strategy
**File**: `src/core/services/dropdown.ts`
**Changes Needed**:
- ❌ Remove automatic loading on login
- ❌ Remove caching wrappers (fetchClasses, fetchAllSubjects, etc.)
- ❌ Remove clearDropdownCache
- ✅ Keep only direct API functions (getClasses, getSubjects, etc.)
- ✅ Load ONLY when Create Assessment screens open

**Action**:
```typescript
// Remove these cached wrappers:
- fetchClasses()
- fetchAllSubjects()
- fetchSubjectsByClass()
- fetchLevels()
- clearDropdownCache()

// Keep only:
- getClasses()
- getSubjects()
- getSubjectsByClass()
- getDifficultyLevels()
```

### 6. Remove/Archive Data Loader
**Files to Remove/Archive**:
- `src/core/services/dataLoader.ts` → Archive or delete
- `DATA_LOADING_OPTIMIZATION.md` → Archive
- `DATA_LOADING_QUICK_REFERENCE.md` → Archive

**Action**: These files are no longer needed with the new architecture

### 7. Update Dashboard Store
**File**: `src/core/store/dashboard.store.ts`
**Current Issues**:
- Global store was for caching - no longer needed
- Each hook manages its own state

**Decision**:
- Option A: Keep store for shared state between screens
- Option B: Remove store, let each screen manage own state
- **Recommendation**: Option B - Remove global store, use hook state only

### 8. Update Screen Components
**Files to Update**:
- `src/platforms/mobile/screens/StudentDashboard.tsx`
- `src/platforms/mobile/screens/TeacherDashboard.tsx`
- `src/screens/Assessments.tsx`
- `src/screens/StudentList.tsx`
- `src/screens/ClassesList.tsx`

**Changes Needed**:
- Update to use new hook signatures
- Handle new loading states
- Use new data access methods (getQuizById, getQuizzesByStatus, etc.)

### 9. Update Assessment Creation Screens
**Files**:
- `src/screens/CreateAIQuizScreen.tsx`
- `src/screens/CreateDocumentQuizScreen.tsx`
- `src/screens/CreateImageQuizScreen.tsx`
- `src/screens/CreateWebsiteQuizScreen.tsx`
- `src/screens/CreateYouTubeQuizScreen.tsx`

**Changes**:
- Load dropdowns on screen mount (not before)
- Call `getClasses()`, `getSubjects()` directly
- No caching - fresh load each time screen opens

---

## 🔧 API Usage Rules

### Student Flow
```typescript
// On Dashboard Mount
GET /api/v1/dashboard/quizzes?view_type=student_details&limit=1000

// Store in memory:
const [allQuizzes, setAllQuizzes] = useState<StudentQuiz[]>([]);

// Derive all views from this:
- Dashboard stats
- Assessment list
- Pending/Completed/Missed quizzes
- Quiz details (from allQuizzes.find())

// Never call again unless user manually refreshes
```

### Teacher Flow
```typescript
// On Dashboard Mount
GET /api/v1/dashboard/quizzes?view_type=summary&limit=1000

// Store in memory:
const [allQuizzes, setAllQuizzes] = useState<TeacherQuiz[]>([]);

// Derive:
- Dashboard stats
- Quiz lists
- Class counts
- Recent assessments

// On Class/Student View Open (ON-DEMAND)
GET /api/v1/dashboard/quizzes?view_type=class_wise_students&classroom_id=X

// Cache per classroom:
const [studentLists, setStudentLists] = useState<Record<string, Student[]>>({});

// Never call again for same classroom
```

### Dropdown Flow
```typescript
// On Create Assessment Screen Mount
const classes = await getClasses();
const subjects = await getSubjects();
const levels = await getDifficultyLevels();

// NO caching
// Load fresh each time screen opens
// Simple and predictable
```

---

## 🚫 What NOT to Do

1. ❌ **Don't preload data before login**
2. ❌ **Don't use caching libraries**
3. ❌ **Don't call same API multiple times**
4. ❌ **Don't mix student/teacher logic**
5. ❌ **Don't auto-redirect based on tokens**
6. ❌ **Don't use global stores for caching**
7. ❌ **Don't load dropdowns on login**
8. ❌ **Don't background poll/refresh**

---

## ✅ What TO Do

1. ✅ **Always show login first**
2. ✅ **Load data on screen mount only**
3. ✅ **Store in component/hook state**
4. ✅ **Reuse in-memory data for filtering/navigation**
5. ✅ **Separate student and teacher hooks completely**
6. ✅ **Load dropdowns only when needed**
7. ✅ **Use single API per screen**
8. ✅ **Let user control refreshes**

---

## 📊 State Management Strategy

### Before (OLD - Caching Based)
```
Login → Auto-load all data → Store in global cache → Screens use cache
❌ Complex
❌ Hidden dependencies  
❌ Hard to debug
❌ Race conditions
```

### After (NEW - Simple State)
```
Login → Screen mounts → Screen loads own data → Stores in hook state → Reuses for views
✅ Simple
✅ Explicit
✅ Easy to debug
✅ No race conditions
```

---

## 🔍 Testing Checklist

### Student Flow
- [ ] Login shows first (no auto-redirect)
- [ ] Dashboard calls API once on mount
- [ ] Navigate to Assessments - no new API call
- [ ] Filter quizzes - no API call (uses memory)
- [ ] Click quiz - shows details from memory
- [ ] Refresh - calls API again
- [ ] Logout - clears state

### Teacher Flow  
- [ ] Login shows first
- [ ] Dashboard calls summary API once
- [ ] Dashboard shows stats from summary
- [ ] Navigate to Assessments - no new API call
- [ ] Click class - NOW calls class_wise_students API
- [ ] Click same class again - uses cached data
- [ ] Refresh - clears cache, reloads

### Dropdown Flow
- [ ] No dropdown calls before login
- [ ] Create Assessment screen loads dropdowns
- [ ] Navigate away and back - loads again (no cache)
- [ ] Simple and predictable

---

## 📝 Migration Steps

1. ✅ Remove dataLoader imports and calls from useAuth
2. ✅ Create new dashboard hooks with single API pattern
3. ⏳ Replace old hooks with new ones
4. ⏳ Remove dropdown caching
5. ⏳ Update all screen components
6. ⏳ Test student flow end-to-end
7. ⏳ Test teacher flow end-to-end
8. ⏳ Archive old files
9. ⏳ Update documentation

---

## 🎯 Expected Outcomes

### Performance
- Fewer total API calls
- Predictable load times
- No race conditions
- No 429 errors

### Code Quality  
- Simple, linear flow
- Easy to debug
- Clear data sources
- No hidden dependencies

### User Experience
- Fast initial load
- Instant navigation
- Predictable refresh behavior
- Clear loading states

---

## 📚 Key Files Summary

### Keep & Update
- `src/core/hooks/useAuth.ts` ✅
- `src/core/hooks/useStudentDashboard.ts` (replace)
- `src/core/hooks/useTeacherDashboard.ts` (replace)
- `src/core/services/dashboardApi.ts` ✅
- `src/core/services/dropdown.ts` (simplify)
- `src/core/context/AuthContext.tsx` ✅

### Archive/Remove
- `src/core/services/dataLoader.ts`
- `src/core/store/dashboard.store.ts` (optional)
- `DATA_LOADING_OPTIMIZATION.md`
- `DATA_LOADING_QUICK_REFERENCE.md`

### Create New
- This implementation plan ✅
- New API usage documentation
- New developer guidelines

---

## 🚀 Next Steps

1. Review and approve this plan
2. Replace old hooks with new hooks
3. Remove dropdown caching
4. Update screen components
5. Test thoroughly
6. Document new patterns
7. Clean up old files

**Estimated Time**: 4-6 hours for complete refactoring

**Risk Level**: Medium (major architectural change)

**Rollback Plan**: Keep `.old.ts` backups of all modified files
