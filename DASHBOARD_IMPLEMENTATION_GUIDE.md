# Dashboard Implementation Guide

## 📊 Overview

This guide explains the implemented dashboard designs matching your provided images with all navigation features.

---

## 👨‍🏫 Teacher Dashboard Features

### Stats Cards (Clickable)
All stats cards are clickable and navigate to filtered views:

1. **Total Students** → StudentList page (all students)
2. **Total Classes** → ClassesList page (all classrooms)
3. **Total Assessments** → Assessments page (filter: 'all')
4. **Ongoing Tests** → Assessments page (filter: 'active')

```typescript
// Example: Clicking "Total Assessments"
navigation.navigate('Assessments', { filter: 'all' });

// Example: Clicking "Ongoing Tests"
navigation.navigate('Assessments', { filter: 'active' });
```

### Create Assessment Section
5 tiles that navigate to respective creation screens:

| Tile | Navigation Screen |
|------|------------------|
| AI Assessment | `CreateAIQuizScreen` |
| Upload PDF | `CreateDocumentQuizScreen` |
| Image Quiz | `CreateImageQuizScreen` |
| Web Link Quiz | `CreateWebsiteQuizScreen` |
| Manual Test | `CreateManualQuizScreen` |

### Weak Students List
- Shows students with performance below 50%
- Displays student name and percentage
- Click to view student details

### Recent Assessments
- Shows latest assessments
- Color-coded status badges:
  - **Active** (green)
  - **Completed** (blue)
  - **Review** (orange)

---

## 👨‍🎓 Student Dashboard Features

### Stats Cards

1. **Next Quiz** → Shows upcoming quiz date
2. **Upcoming** → Shows count of upcoming tests

### Weak Topics
- Lists topics where student scored < 60%
- Color-coded performance indicators
- Click to view topic details

### Practice & Learn Section
5 practice tiles with smart prefill from weak topics:

| Tile | Type | Prefill |
|------|------|---------|
| Quiz | AI Quiz | First weak topic |
| Doc Tutor | Document | First weak topic |
| Image Tutor | Image | First weak topic |
| Web Tutor | Website | First weak topic |
| Self Test | Manual | First weak topic |

```typescript
// Practice tiles automatically prefill with weak topic
const params = {
  topic: weakTopics[0].topic,  // e.g., "Algebra"
  difficulty: 'easy',
  subject: stats.subject        // e.g., "Mathematics"
};
```

### Recent Activity
- Shows last 3 completed quizzes
- Displays quiz name and score percentage
- Shows completion date

---

## 🎯 Navigation Implementation

### Dashboard to Assessments (with filters)

**Teacher Dashboard:**
```typescript
// Click on "Total Assessments"
<TouchableOpacity onPress={() => {
  navigation.navigate('Assessments', { filter: 'all' });
}}>

// Click on "Ongoing Tests"  
<TouchableOpacity onPress={() => {
  navigation.navigate('Assessments', { filter: 'active' });
}}>
```

**Assessments Screen receives filter:**
```typescript
// Assessments.tsx
interface Props {
  route?: {
    params?: {
      filter?: 'all' | 'active' | 'draft' | 'completed';
    };
  };
}

// Get filter from route
const initialFilter = route?.params?.filter || 'all';
const [selectedTab, setSelectedTab] = useState(initialFilter);
```

### Create Assessment Tiles Navigation

**Both dashboards use same navigation pattern:**
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
```

---

## ➕ Header Create Button

### Integration Steps

1. **Add Header to your navigator:**

```typescript
import Header from './core/components/Header';

<Stack.Navigator
  screenOptions={({ navigation }) => ({
    header: () => (
      <Header
        navigation={navigation}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('Profile')}
        showCreateButton={true}
      />
    ),
  })}
>
  {/* Your screens */}
</Stack.Navigator>
```

2. **Verify user role:**
The Create button only shows for teachers (user.role === 'instructor')

```typescript
// In Header.tsx
const isTeacher = user?.role === 'instructor';

{isTeacher && showCreateButton && (
  <TouchableOpacity style={styles.createButton}>
    <Text>+ Create</Text>
  </TouchableOpacity>
)}
```

3. **Ensure navigation screens are registered:**

```typescript
<Stack.Screen name="CreateAIQuizScreen" component={CreateAIQuizScreen} />
<Stack.Screen name="CreateDocumentQuizScreen" component={CreateDocumentQuizScreen} />
<Stack.Screen name="CreateImageQuizScreen" component={CreateImageQuizScreen} />
<Stack.Screen name="CreateWebsiteQuizScreen" component={CreateWebsiteQuizScreen} />
<Stack.Screen name="CreateYouTubeQuizScreen" component={CreateYouTubeQuizScreen} />
```

### Troubleshooting Create Button

**Not showing?** Check:

✓ User role is 'instructor' (not 'teacher')
✓ `showCreateButton={true}` is set
✓ Header component is actually rendering
✓ Navigation prop is passed correctly
✓ Create screens are registered in navigator

---

## 🎨 Design Implementation

### Teacher Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  EduVijna Logo    [+ Create]    [🔔] [👤]      │ ← Header
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │
│  │ Students │ │ Classes  │ │Assessment│ │Test│ │ ← Stats Cards
│  │   320    │ │    18    │ │    45    │ │ 3  │ │   (Clickable)
│  └──────────┘ └──────────┘ └──────────┘ └────┘ │
│                                                  │
│  Create Assessment                               │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│  │ AI │ │PDF │ │IMG │ │WEB │ │MAN │            │ ← Create Tiles
│  └────┘ └────┘ └────┘ └────┘ └────┘            │   (Clickable)
│                                                  │
│  Weak Students         Recent Assessments        │
│  ┌──────────────┐     ┌──────────────┐          │
│  │ Emma   50%   │     │ Math    Active│          │
│  │ Chris  52%   │     │ History Done  │          │ ← Lists
│  │ Kody   50%   │     │ Geography Rev │          │
│  └──────────────┘     └──────────────┘          │
└─────────────────────────────────────────────────┘
```

### Student Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  EduVijna Logo              [🔔] [👤]          │ ← Header
├─────────────────────────────────────────────────┤  (No Create button)
│  ┌─────────────┐ ┌─────────────┐               │
│  │ Next Quiz   │ │ Upcoming    │               │ ← Stats Cards
│  │   Jan 12    │ │    5        │               │
│  └─────────────┘ └─────────────┘               │
│                                                  │
│  Weak Topics                                     │
│  • Algebra - Math Practice                       │
│  • Grammar - English                             │ ← Weak Topics
│  • Gravity - Physics Review                      │
│                                                  │
│  Practice & Learn                                │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│  │Quiz│ │Doc │ │IMG │ │Web │ │Test│            │ ← Practice Tiles
│  └────┘ └────┘ └────┘ └────┘ └────┘            │   (Prefilled)
│                                                  │
│  Recent Activity                                 │
│  • History Test - 86%                            │
│  • Math Quiz - 90%                               │ ← Recent Activity
└─────────────────────────────────────────────────┘
```

---

## 🔄 Complete Navigation Flow

### Teacher Flow
```
Dashboard
  ├─ Click "Total Assessments" → Assessments (filter: all)
  ├─ Click "Ongoing Tests" → Assessments (filter: active)
  ├─ Click "Total Students" → StudentList
  ├─ Click "Total Classes" → ClassesList
  ├─ Click "AI Assessment" → CreateAIQuizScreen
  ├─ Click "Upload PDF" → CreateDocumentQuizScreen
  ├─ Click "Image Quiz" → CreateImageQuizScreen
  ├─ Click "Web Link" → CreateWebsiteQuizScreen
  ├─ Click "Manual Test" → CreateManualQuizScreen
  └─ Header "+ Create" → Dropdown with all create options
```

### Student Flow
```
Dashboard
  ├─ Click "Quiz" → CreateAIQuizScreen (topic: weak topic)
  ├─ Click "Doc Tutor" → CreateDocumentQuizScreen (topic: weak topic)
  ├─ Click "Image Tutor" → CreateImageQuizScreen (topic: weak topic)
  ├─ Click "Web Tutor" → CreateWebsiteQuizScreen (topic: weak topic)
  └─ Click "Self Test" → CreateAIQuizScreen (topic: weak topic)
```

---

## ✅ Implementation Checklist

### Teacher Dashboard
- [x] Stats cards navigate to filtered views
- [x] Total Assessments → Assessments (all)
- [x] Ongoing Tests → Assessments (active)
- [x] Create tiles link to correct screens
- [x] Weak students list displays
- [x] Recent assessments with status colors

### Student Dashboard  
- [x] Practice tiles prefill weak topics
- [x] Weak topics list displays
- [x] Recent activity shows completed quizzes
- [x] Stats cards show next quiz/upcoming count

### Header
- [x] Create button visible for teachers
- [x] Dropdown menu with 6 create options
- [x] Navigation to create screens works
- [x] Role-based display (teachers only)

### Assessments Page
- [x] Accepts filter parameter from route
- [x] Displays filtered assessments
- [x] Tab selection works correctly

---

## 🐛 Troubleshooting

### Create Button Not Showing

1. **Check user role:**
```typescript
// In your auth context, ensure role is 'instructor'
const user = { role: 'instructor' }; // NOT 'teacher'
```

2. **Check Header integration:**
```typescript
// Make sure Header is in your navigator
<Stack.Navigator
  screenOptions={{
    header: () => <Header navigation={navigation} />
  }}
>
```

3. **Check screens are registered:**
```typescript
// All create screens must be in navigator
<Stack.Screen name="CreateAIQuizScreen" ... />
```

### Stats Cards Not Navigating

1. **Check navigation prop:**
```typescript
// Dashboard must receive navigation prop
<TeacherDashboard navigation={navigation} />
```

2. **Check Assessments screen exists:**
```typescript
<Stack.Screen name="Assessments" component={Assessments} />
```

### Filter Not Working in Assessments

1. **Check route params:**
```typescript
// In Assessments component
const filter = route?.params?.filter || 'all';
```

2. **Check navigation call:**
```typescript
// Pass filter as param
navigation.navigate('Assessments', { filter: 'active' });
```

---

## 📝 Files Modified

1. **src/screens/TeacherDashboard.tsx**
   - Added navigation to Assessments with filters
   - Fixed create tile screen names
   
2. **src/screens/StudentDashboard.tsx**
   - Fixed practice tile screen names
   
3. **src/screens/Assessments.tsx**
   - Added route params support
   - Set initial filter from route
   
4. **src/core/components/Header.tsx**
   - Already has Create button (verify integration)

---

## 🎉 Result

✅ **Teacher Dashboard** matches design image
✅ **Student Dashboard** matches design image  
✅ **Navigation** works from all clickable elements
✅ **Header Create button** ready to integrate
✅ **Assessments filtering** implemented
✅ **Smart prefill** for practice tiles

---

## 📚 Example Files

For complete integration examples, see:
- `src/examples/HeaderIntegration.example.tsx` - Header setup guide
- `HEADER_INTEGRATION_GUIDE.md` - Header documentation

---

**Need Help?** Check the troubleshooting sections above or review the example files!
