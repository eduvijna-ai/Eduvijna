# Create Assessment Integration Guide

## Files Created

### 1. Create Quiz Screens (5 screens)
- `src/screens/CreateAIQuizScreen.tsx` - AI-generated quiz creation
- `src/screens/CreateDocumentQuizScreen.tsx` - PDF/Document upload quiz
- `src/screens/CreateImageQuizScreen.tsx` - Image-based quiz creation
- `src/screens/CreateWebsiteQuizScreen.tsx` - Website URL quiz generation
- `src/screens/CreateYouTubeQuizScreen.tsx` - YouTube video quiz creation

### 2. Components
- `src/components/CreateQuizButton.tsx` - Floating + button with dropdown menu

## Features Implemented

### ✅ Create Quiz Screens
Each screen includes:
- Back button navigation
- Icon and colored header matching assessment type
- Form with topic/content input
- Number of questions counter
- Difficulty selector (Easy/Medium/Hard)
- Duration input
- Generate button with loading state
- Responsive web/mobile layouts

### ✅ Teacher Dashboard Integration
- Create Assessment tiles navigate to respective screens:
  - AI Assessment → CreateAIQuiz
  - Upload PDF → CreateDocumentQuiz
  - Image Quiz → CreateImageQuiz
  - Web Link Quiz → CreateWebsiteQuiz
  - Manual Test → CreateManualQuiz

### ✅ Student Dashboard - Smart Practice
- Practice & Learn tiles automatically prefill weak topics:
  - Gets student's weakest topic from `weakTopics[0]`
  - Prefills topic, difficulty (easy), and subject
  - Helps students practice on areas they need improvement
- Practice tiles navigate to:
  - Quiz → CreateAIQuiz (with weak topic)
  - Doc Tutor → CreateDocumentQuiz
  - Image Tutor → CreateImageQuiz
  - Web Tutor → CreateWebsiteQuiz
  - Self Test → CreateAIQuiz (with weak topic)

### ✅ Floating + Button (CreateQuizButton)
Shows dropdown menu with all 6 create options:
1. AI Quiz - Generate with AI
2. Document Quiz - From PDF/Doc
3. Image Quiz - From Image
4. Website Quiz - From URL
5. YouTube Quiz - From Video
6. Manual Quiz - Create Manually

## How to Add CreateQuizButton to Header

### Example: App.tsx or Header Component

```tsx
import CreateQuizButton from '@components/CreateQuizButton';

function AppHeader({ navigation }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>EduVijna</Text>
      
      {/* Add floating + button */}
      <CreateQuizButton navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
});
```

### Navigation Setup Required

Add these screens to your navigator (App.tsx or navigation config):

```tsx
import CreateAIQuizScreen from '@screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from '@screens/CreateDocumentQuizScreen';
import CreateImageQuizScreen from '@screens/CreateImageQuizScreen';
import CreateWebsiteQuizScreen from '@screens/CreateWebsiteQuizScreen';
import CreateYouTubeQuizScreen from '@screens/CreateYouTubeQuizScreen';

// In your Stack Navigator:
<Stack.Screen name="CreateAIQuiz" component={CreateAIQuizScreen} />
<Stack.Screen name="CreateDocumentQuiz" component={CreateDocumentQuizScreen} />
<Stack.Screen name="CreateImageQuiz" component={CreateImageQuizScreen} />
<Stack.Screen name="CreateWebsiteQuiz" component={CreateWebsiteQuizScreen} />
<Stack.Screen name="CreateYouTubeQuiz" component={CreateYouTubeQuizScreen} />
```

## Smart Practice Feature

When a student clicks on Practice tiles, the system:
1. Checks their `weakTopics` from the dashboard hook
2. Takes the weakest topic (`weakTopics[0].topic`)
3. Pre-fills the create quiz form with:
   - **Topic**: Student's weakest topic
   - **Difficulty**: Easy (to help them improve)
   - **Subject**: Current subject (if available)

This creates a personalized practice experience where students automatically practice on topics they're struggling with.

## User Flow

### Teacher Flow:
1. Click on "Create Assessment" tile → Opens specific create screen
2. OR click + button in header → Shows dropdown menu → Select quiz type
3. Fill form with quiz details
4. Click "Generate Quiz" → Quiz is created

### Student Flow:
1. View "Practice & Learn" section
2. Click on practice type (e.g., "Quiz")
3. Form opens with **weak topic already filled in**
4. Adjust settings if needed
5. Generate practice quiz on their weak area

## API Integration Points

Each create screen has a `handleGenerate` function where you should:
1. Upload file (for PDF/Image screens)
2. Call your quiz generation API
3. Pass parameters (topic, difficulty, duration, etc.)
4. Navigate to quiz editor or quiz list on success

Example API call location in CreateAIQuizScreen:
```tsx
const handleGenerate = async () => {
  // TODO: Replace with actual API call
  const response = await createAIQuiz({
    topic,
    subject,
    numberOfQuestions,
    difficulty,
    duration,
    additionalInstructions,
  });
  
  navigation.navigate('QuizEditor', { quizId: response.id });
};
```

## Styling

All screens use:
- Responsive design (mobile/web breakpoints)
- Theme colors from `useTheme()` hook
- Consistent form styling
- Icon-based visual hierarchy
- Color-coded quiz types

## Next Steps

1. Add CreateQuizButton to your app header
2. Configure navigation routes
3. Implement actual API calls in each create screen
4. Add file picker for Document/Image screens
5. Test practice flow with weak topics
6. Add CreateManualQuiz screen for manual quiz creation
