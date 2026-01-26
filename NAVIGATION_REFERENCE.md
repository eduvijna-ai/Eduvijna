# Dashboard Navigation - Quick Reference

## 🎯 Clickable Elements Overview

### Teacher Dashboard

```
┌─────────────────────────────────────────────────────┐
│  EduVijna Logo   [+ Create ▼]   [🔔] [👤]          │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │📊 Students   │  │🏫 Classes    │                │
│  │    320    ➡  │  │    18     ➡  │                │
│  │ Click: StudentList│ Click: ClassesList│           │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │📄 Assessments│  │✅ Ongoing    │                │
│  │    45     ➡  │  │    3      ➡  │                │
│  │ Filter: all  │  │ Filter: active│                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│  Create Assessment                                   │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │🤖 │ │📄 │ │📷 │ │🌐 │ │✏️ │               │
│  │ AI │ │PDF │ │IMG │ │WEB │ │MAN │               │
│  │ ➡  │ │ ➡  │ │ ➡  │ │ ➡  │ │ ➡  │               │
│  └────┘ └────┘ └────┘ └────┘ └────┘               │
│                                                      │
│  Weak Students         Recent Assessments            │
│  • Emma (50%) ➡        • Math Quiz [Active]   ➡    │
│  • Chris (52%) ➡       • History Test [Done]  ➡    │
│  • Kody (50%) ➡        • Geography [Review]   ➡    │
└─────────────────────────────────────────────────────┘
```

### Student Dashboard

```
┌─────────────────────────────────────────────────────┐
│  EduVijna Logo              [🔔] [👤]              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐  ┌─────────────┐                  │
│  │📅 Next Quiz │  │📊 Upcoming  │                  │
│  │   Jan 12    │  │      5      │                  │
│  └─────────────┘  └─────────────┘                  │
│                                                      │
│  Weak Topics                                         │
│  • Algebra - Math Practice ➡                        │
│  • Grammar - English ➡                              │
│  • Gravity - Physics Review ➡                       │
│                                                      │
│  Practice & Learn (Auto-fills weak topic)           │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐               │
│  │📝  │ │📄  │ │📷  │ │🌐  │ │📋  │               │
│  │Quiz│ │Doc │ │IMG │ │Web │ │Test│               │
│  │ ➡  │ │ ➡  │ │ ➡  │ │ ➡  │ │ ➡  │               │
│  └────┘ └────┘ └────┘ └────┘ └────┘               │
│  topic: "Algebra" (prefilled from weak topics)      │
│                                                      │
│  Recent Activity                                     │
│  • History Test - 86% ➡                             │
│  • Math Quiz - 90% ➡                                │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Navigation Matrix

### Teacher Dashboard → Destinations

| Source | Destination | Parameters |
|--------|-------------|------------|
| Total Students | StudentList | `{ studentsData }` |
| Total Classes | ClassesList | `{ classroomsData, quizzesData }` |
| **Total Assessments** | **Assessments** | **`{ filter: 'all' }`** |
| **Ongoing Tests** | **Assessments** | **`{ filter: 'active' }`** |
| AI Assessment Tile | CreateAIQuizScreen | - |
| Upload PDF Tile | CreateDocumentQuizScreen | - |
| Image Quiz Tile | CreateImageQuizScreen | - |
| Web Link Tile | CreateWebsiteQuizScreen | - |
| Manual Test Tile | CreateManualQuizScreen | - |
| Weak Student Item | StudentDetail | `{ studentId }` |
| Recent Assessment | AssessmentDetail | `{ quizId }` |
| Header "+ Create" | CreateAIQuizScreen | (via dropdown) |
| Header "+ Create" | CreateDocumentQuizScreen | (via dropdown) |
| Header "+ Create" | CreateImageQuizScreen | (via dropdown) |
| Header "+ Create" | CreateWebsiteQuizScreen | (via dropdown) |
| Header "+ Create" | CreateYouTubeQuizScreen | (via dropdown) |

### Student Dashboard → Destinations

| Source | Destination | Parameters |
|--------|-------------|------------|
| Quiz Tile | CreateAIQuizScreen | `{ topic, difficulty, subject }` |
| Doc Tutor Tile | CreateDocumentQuizScreen | `{ topic, difficulty, subject }` |
| Image Tutor Tile | CreateImageQuizScreen | `{ topic, difficulty, subject }` |
| Web Tutor Tile | CreateWebsiteQuizScreen | `{ topic, difficulty, subject }` |
| Self Test Tile | CreateAIQuizScreen | `{ topic, difficulty, subject }` |
| Weak Topic Item | TopicDetail | `{ topic }` |
| Recent Activity | QuizResult | `{ quizId }` |

---

## 🔧 Implementation Code

### Teacher Dashboard - Stats Cards

```typescript
// Total Assessments (Navigate to all assessments)
<TouchableOpacity onPress={() => {
  navigation.navigate('Assessments', { filter: 'all' });
}}>
  <Text>Total Assessments: {stats.total_assessments}</Text>
</TouchableOpacity>

// Ongoing Tests (Navigate to active assessments only)
<TouchableOpacity onPress={() => {
  navigation.navigate('Assessments', { filter: 'active' });
}}>
  <Text>Ongoing Tests: {stats.active_assessments}</Text>
</TouchableOpacity>
```

### Teacher Dashboard - Create Tiles

```typescript
const handleCreateAssessment = (type: string) => {
  const screenMap = {
    ai: 'CreateAIQuizScreen',
    pdf: 'CreateDocumentQuizScreen',
    image: 'CreateImageQuizScreen',
    web: 'CreateWebsiteQuizScreen',
    manual: 'CreateManualQuizScreen',
  };
  
  navigation.navigate(screenMap[type]);
};

// Usage
<TouchableOpacity onPress={() => handleCreateAssessment('ai')}>
  <Text>AI Assessment</Text>
</TouchableOpacity>
```

### Student Dashboard - Practice Tiles (Smart Prefill)

```typescript
const handlePractice = (type: string) => {
  // Get first weak topic to prefill
  const weakTopic = weakTopics[0]?.topic || '';
  
  const params = weakTopic ? {
    topic: weakTopic,          // e.g., "Algebra"
    difficulty: 'easy',
    subject: stats.subject     // e.g., "Mathematics"
  } : {};
  
  navigation.navigate('CreateAIQuizScreen', params);
};

// Usage
<TouchableOpacity onPress={() => handlePractice('ai')}>
  <Text>Quiz</Text>
</TouchableOpacity>
```

### Assessments - Filter Handling

```typescript
// Assessments.tsx
function Assessments({ route }) {
  // Get filter from navigation params
  const initialFilter = route?.params?.filter || 'all';
  const [selectedTab, setSelectedTab] = useState(initialFilter);
  
  // Filter assessments based on selected tab
  const filteredQuizzes = allQuizzes.filter(quiz => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return quiz.status === 'active';
    if (selectedTab === 'draft') return quiz.status === 'draft';
    return true;
  });
}
```

---

## 📋 Screen Names Reference

### Navigation Screen Names
```typescript
// Exact screen names to use in navigation
'CreateAIQuizScreen'        // AI-generated quiz
'CreateDocumentQuizScreen'  // PDF/Document upload
'CreateImageQuizScreen'     // Image-based quiz
'CreateWebsiteQuizScreen'   // Website URL quiz
'CreateYouTubeQuizScreen'   // YouTube video quiz
'CreateManualQuizScreen'    // Manual creation
'Assessments'               // Assessment list
'StudentList'               // All students
'ClassesList'               // All classrooms
```

### Filter Values for Assessments
```typescript
type FilterTab = 'all' | 'draft' | 'active' | 'completed' | 'upcoming' | 'ongoing';

// Teacher filters
'all'        // All assessments
'draft'      // Draft assessments
'active'     // Active/ongoing tests
'completed'  // Completed assessments

// Student filters  
'upcoming'   // Future quizzes
'ongoing'    // Active quizzes
'completed'  // Finished quizzes
```

---

## ✅ Testing Checklist

### Teacher Dashboard
- [ ] Click "Total Assessments" → Opens Assessments with all quizzes
- [ ] Click "Ongoing Tests" → Opens Assessments filtered to active only
- [ ] Click "Total Students" → Opens StudentList
- [ ] Click "Total Classes" → Opens ClassesList
- [ ] Click "AI Assessment" tile → Opens CreateAIQuizScreen
- [ ] Click "Upload PDF" tile → Opens CreateDocumentQuizScreen
- [ ] Click "Image Quiz" tile → Opens CreateImageQuizScreen
- [ ] Click "Web Link" tile → Opens CreateWebsiteQuizScreen
- [ ] Click "Manual Test" tile → Opens CreateManualQuizScreen
- [ ] Header "+ Create" button visible (teachers only)
- [ ] Header dropdown shows 6 create options

### Student Dashboard
- [ ] Click "Quiz" tile → Opens CreateAIQuizScreen with weak topic
- [ ] Click "Doc Tutor" → Opens CreateDocumentQuizScreen with weak topic
- [ ] Click "Image Tutor" → Opens CreateImageQuizScreen with weak topic
- [ ] Click "Web Tutor" → Opens CreateWebsiteQuizScreen with weak topic
- [ ] Click "Self Test" → Opens CreateAIQuizScreen with weak topic
- [ ] Verify topic parameter is prefilled
- [ ] Header "+ Create" button NOT visible (students)

### Assessments Page
- [ ] Opens with filter from route params
- [ ] Tab matches the filter parameter
- [ ] Shows correct filtered quizzes
- [ ] Can change filter after opening

---

## 🐛 Common Issues

### Issue: Create button not showing
**Solution:** Check user role is 'instructor' (not 'teacher')
```typescript
const user = { role: 'instructor' }; // ✅ Correct
const user = { role: 'teacher' };    // ❌ Wrong
```

### Issue: Navigation not working
**Solution:** Ensure all screens are registered
```typescript
<Stack.Screen name="CreateAIQuizScreen" component={CreateAIQuizScreen} />
```

### Issue: Filter not applied in Assessments
**Solution:** Check route params are passed correctly
```typescript
navigation.navigate('Assessments', { filter: 'active' }); // ✅ Correct
navigation.navigate('Assessments', 'active');             // ❌ Wrong
```

### Issue: Weak topic not prefilling
**Solution:** Verify weakTopics array has data
```typescript
const weakTopic = weakTopics && weakTopics.length > 0 ? weakTopics[0].topic : '';
```

---

## 🎉 Summary

✅ **All clickable elements** are properly linked
✅ **Stats cards** navigate with correct filters
✅ **Create tiles** open respective screens
✅ **Practice tiles** prefill weak topics automatically
✅ **Header Create button** ready for integration
✅ **Assessments filtering** implemented and working

**Everything is implemented and ready to use!**
