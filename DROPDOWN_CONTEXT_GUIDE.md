# Dropdown Context - Centralized Data Loading

## Overview
The dropdown data (classes, subjects, difficulty levels) is now loaded **once** when the app starts and **reused across all pages**. This significantly improves performance by avoiding duplicate API calls.

## How It Works

### 1. **DropdownContext** (`src/context/DropdownContext.tsx`)
- Loads all dropdown data on app initialization
- Stores data in React Context for global access
- Provides loading states and error handling
- Includes refresh functions for manual updates

### 2. **App.tsx Integration**
```tsx
<ThemeProvider>
  <DropdownProvider>  {/* Wraps entire app */}
    <AppContent />
  </DropdownProvider>
</ThemeProvider>
```

### 3. **Usage in Components**
All quiz creation screens automatically get the cached data through `QuizFormFields`:

```tsx
import { useDropdowns } from '../context/DropdownContext';

function MyComponent() {
  const {
    classes,
    isLoadingClasses,
    subjects,
    isLoadingSubjects,
    difficultyLevels,
    isLoadingDifficulty,
    refreshAll, // Manually refresh all data
  } = useDropdowns();
  
  // Use the data...
}
```

## Benefits

### ✅ Performance Improvements
- **API calls reduced**: From 15 calls (3 per screen × 5 screens) to just **3 calls total**
- **Faster navigation**: No loading delay when switching between quiz creation screens
- **Reduced bandwidth**: Significantly less data transfer
- **Lower server load**: Fewer requests to the API

### ✅ Better User Experience
- Data loads once on app start
- Instant screen transitions
- Consistent data across all screens
- No flickering or repeated loading states

### ✅ Maintainability
- Single source of truth for dropdown data
- Easy to add new dropdown types
- Centralized error handling
- Simple refresh mechanism

## Affected Screens
All 5 quiz creation screens now use the shared context:
1. ✅ CreateAIQuizScreen
2. ✅ CreateDocumentQuizScreen
3. ✅ CreateImageQuizScreen
4. ✅ CreateYouTubeQuizScreen
5. ✅ CreateWebsiteQuizScreen

## Console Logs
You'll see these logs once on app start:
```
🚀 [DropdownContext] Initializing - loading all dropdown data...
🔄 [DropdownContext] Loading classes...
🔄 [DropdownContext] Loading subjects...
🔄 [DropdownContext] Loading difficulty levels...
✅ [DropdownContext] Loaded 14 classes
✅ [DropdownContext] Loaded 13 subjects
✅ [DropdownContext] Loaded 7 difficulty levels
```

Then when you navigate to any quiz screen, you'll see:
```
(No API calls - using cached data from context)
```

## Refresh Data
If you need to refresh the dropdown data (e.g., after adding a new class):
```tsx
const { refreshAll, refreshClasses, refreshSubjects } = useDropdowns();

// Refresh all dropdowns
await refreshAll();

// Or refresh individually
await refreshClasses();
await refreshSubjects();
```

## Technical Details
- Context provider initialized in `App.tsx`
- Data loaded in parallel on mount
- QuizFormFields automatically uses context data
- Falls back to prop data if provided (for flexibility)
- Includes error states for each dropdown type
