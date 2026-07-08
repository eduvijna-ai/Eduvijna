# EduVijna Mobile UI Reference

> **Purpose:** Single reference for building and maintaining the **React Native / Expo mobile app**. Use this when adding screens, forms, dropdowns, or error handling.  
> **Last updated:** July 2026  
> **Related docs:** [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (visual tokens) · [ARCHITECTURE.md](./ARCHITECTURE.md) (layer rules) · [ONBOARDING_GUIDE.md](./ONBOARDING_GUIDE.md) (setup) · [SKILLS.md](./SKILLS.md) (full architecture)

---

## Table of Contents

1. [Quick rules](#1-quick-rules)
2. [Theme & styling](#2-theme--styling)
3. [Forms & inputs](#3-forms--inputs)
4. [Dropdowns & selectors](#4-dropdowns--selectors)
5. [Native components — do & don't](#5-native-components--do--dont)
6. [Assessment module patterns](#6-assessment-module-patterns)
7. [Error handling & crash recovery](#7-error-handling--crash-recovery)
8. [Architecture rules for UI](#8-architecture-rules-for-ui)
9. [Adding a new screen checklist](#9-adding-a-new-screen-checklist)
10. [File index](#10-file-index)

---

## 1. Quick rules

| Rule | Why |
|------|-----|
| **Never** use `@react-native-picker/picker` inline on forms with `TextInput` | Android native crash when TextInput re-renders sibling Pickers |
| **Always** use `ModalDropdownField` for dropdowns on mixed forms | Safe modal pattern; ESLint enforces this |
| **Always** use `useTheme()` colors — never hardcode except semantic accents | Light/dark consistency |
| **Always** use `QuizFormFields` for class/subject/lesson quiz metadata | Shared modal dropdowns + lesson field |
| **Never** import `@core/api` from screens/components | ESLint blocks; use hooks |
| **Date/time** pickers only inside a `Modal` | Avoids Android inline picker issues |
| **LaTeX/math** via `MathRenderer` only | WebView cap prevents OOM crashes |

---

## 2. Theme & styling

### Source of truth

| Item | Path |
|------|------|
| Theme tokens | `src/theme/theme.ts` |
| Theme provider | `src/context/ThemeContext.tsx` |
| Fonts (Poppins) | `src/theme/useAppFonts.ts` |
| Visual specs (cards, grids) | `DESIGN_SYSTEM.md` |

### Usage in components

```tsx
import { useTheme } from '@context/ThemeContext';

function MyScreen() {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  // ...
}
```

### Brand colors (light theme)

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#1B4F5C` | Buttons, active tabs, links |
| `background` | `#F5F5F5` | Screen background |
| `card` / `cardBackground` | `#FFFFFF` | Cards, inputs |
| `text` | `#1B4F5C` | Primary text |
| `textSecondary` | `#666666` | Labels, hints |
| `border` | theme border | Input borders, dividers |
| `error` | theme error | Validation messages |

### Standard form field sizing

```typescript
// Text inputs & dropdown triggers
borderRadius: 8
minHeight: 48
paddingHorizontal: 12
fontSize: 14

// Field labels
fontSize: 12
fontWeight: '600'
marginBottom: 5

// Section captions (e.g. "ACADEMIC CONTEXT")
fontSize: 11
fontWeight: '700'
letterSpacing: 0.6
color: '#8A94A6'
```

### Path aliases

```typescript
@core/*      → src/core/*
@context/*   → src/context/*
@theme/*     → src/theme/*
@screens/*   → src/screens/*
@components/* → src/components/*
@mobile/*    → src/platforms/mobile/*
```

---

## 3. Forms & inputs

### Text inputs

Use React Native `TextInput` with theme colors:

```tsx
<TextInput
  style={styles.textInput}
  value={lesson}
  onChangeText={setLesson}
  placeholder="Enter lesson name"
  placeholderTextColor={theme.colors.textSecondary}
/>
```

### Multi-field quiz metadata

For **Class, Subject, Lesson, Difficulty, Question count** on quiz creation screens, use:

```tsx
import QuizFormFields from '../components/QuizFormFields';

<QuizFormFields
  showClass
  showSubject
  showLesson
  showDifficultyLevel
  showQuestionCount
  classValue={classId}
  onClassChange={setClassId}
  lessonValue={lesson}
  onLessonChange={setLesson}
  // ...
/>
```

`QuizFormFields` loads dropdown data from `DropdownContext` and uses **modal dropdowns** (not native Pickers).

### Pill / chip selectors (safe for Android)

For **2–7 fixed options** (difficulty, question count, language), prefer horizontal pills:

```tsx
{OPTIONS.map((opt) => (
  <TouchableOpacity
    key={opt.key}
    style={[styles.pill, value === opt.key && styles.pillActive]}
    onPress={() => setValue(opt.key)}
  >
    <Text style={styles.pillText}>{opt.label}</Text>
  </TouchableOpacity>
))}
```

**Used in:** `CreateHandwrittenQuizScreen`, `AssessmentWorkspaceScreen`, `document-upload/*`, `ImageAssessmentScreen`.

### Fixed option sets (no API)

Use pills or `ModalDropdownField` with a static `items` array — not native Picker.

---

## 4. Dropdowns & selectors

### Primary component: `ModalDropdownField`

**Path:** `src/components/ModalDropdownField.tsx`

Use for any dropdown on a screen that also has text inputs.

```tsx
import ModalDropdownField from '../components/ModalDropdownField';

<ModalDropdownField
  label="Class"
  value={classId}
  onChange={setClassId}
  items={classes.map((c) => ({ id: String(c.id), name: c.name }))}
  placeholder="Select class..."
  required
/>
```

| Prop | Description |
|------|-------------|
| `label` | Field label (also used as modal title) |
| `value` | Selected item `id` (string) |
| `onChange` | `(id: string) => void` |
| `items` | `{ id, name?, label? }[]` |
| `placeholder` | Empty-state text |
| `required` | Appends `*` to label |
| `disabled` | Greys out trigger |
| `hideLabel` | Hide label when parent already renders one (e.g. `ShareQuizModal`) |

### Other safe dropdown patterns

| Component | Path | When to use |
|-----------|------|-------------|
| `QuizFormFields` modals | `src/components/QuizFormFields.tsx` | Class/subject with search |
| `FilterComponents` | `src/components/FilterComponents.tsx` | Classroom & date filters on lists |
| `SimpleSelect` | `src/erp/components/common/index.tsx` | ERP forms |
| `SelectField` | `src/erp_schools/components/FormField.tsx` | ERP Schools forms |

### ESLint guard

Importing `@react-native-picker/picker` is **blocked** in `.eslintrc.js`:

```
🚫 Do not use inline Android Picker — use ModalDropdownField instead.
```

---

## 5. Native components — do & don't

### Android crash pattern (critical)

```
❌ BAD: ScrollView with TextInput + inline <Picker> on same screen
        → typing in TextInput re-renders Pickers → native crash → app closes

✅ GOOD: TextInput + ModalDropdownField (TouchableOpacity trigger + Modal list)
```

`AppErrorBoundary` **cannot** catch native Picker crashes — the OS kills the process.

### Component safety matrix

| Component | Safe pattern | Risk if misused |
|-----------|--------------|-----------------|
| Dropdown / select | `ModalDropdownField` or modal list | Inline `Picker` + TextInput = crash |
| Date / time | `DateTimePicker` inside `Modal` only | Inline in ScrollView |
| Math / LaTeX | `MathRenderer` (capped WebViews) | Many uncapped WebViews = OOM |
| Images / files | `expo-image-picker`, `expo-document-picker` | N/A (system UI) |
| Images in lists | `FlatList` + thumbnails | Rendering 50+ WebViews on one screen |

### `MathRenderer`

**Path:** `src/components/MathRenderer.tsx`

- Plain text → native `<Text>`
- LaTeX → KaTeX WebView with **concurrent instance cap**
- Use on quiz questions, explanations, summaries — do not roll custom WebView math

---

## 6. Assessment module patterns

### Screen → component map

| Feature | Screen | Form pattern |
|---------|--------|--------------|
| AI Assessment | `CreateAIQuizScreen.tsx` | `ModalDropdownField` + TextInputs |
| YouTube Quiz | `CreateYouTubeQuizScreen.tsx` | `QuizFormFields` |
| Document Quiz | `CreateDocumentQuizScreen.tsx` | `QuizFormFields` |
| Image Quiz | `CreateImageQuizScreen.tsx` | `QuizFormFields` |
| Website Quiz | `CreateWebsiteQuizScreen.tsx` | `QuizFormFields` |
| Handwritten / exam paper | `CreateHandwrittenQuizScreen.tsx` | TextInput + pills |
| Document workspace | `AssessmentWorkspaceScreen.tsx` | TextInput + pills |
| Document upload flow | `document-upload/*` | TextInput + pills/segments |
| Image assessment | `ImageAssessmentScreen.tsx` | Chips + TextInput |
| Worksheet | `WorksheetScreen.tsx` | `ModalDropdownField` + TextInput |
| Share quiz | `ShareQuizModal.tsx` | `ModalDropdownField` + TextInput |
| Topic summary | `TopicSummaryModal.tsx` | Modal only; `autoGenerate` when visible |

### Dropdown data

| Data | Source |
|------|--------|
| Classes, subjects, difficulty | `DropdownContext` → `src/context/DropdownContext.tsx` |
| Class-scoped subjects | `getSubjectsByClass()` in `src/core/services/dropdown.ts` |
| Competitive exam fields | `getStreams`, `getExams`, etc. in `dropdown.ts` |

Call `refreshAll()` from `useDropdowns()` when a screen mounts if lists may be stale.

### Navigation

Register new assessment screens in:

`src/platforms/mobile/navigation/BottomTabNavigator.tsx`

---

## 7. Error handling & crash recovery

### Layers

| Layer | File | Catches |
|-------|------|---------|
| App-wide boundary | `src/components/AppErrorBoundary.tsx` | React render errors |
| ERP boundary | `src/erp/components/ERPErrorBoundary.tsx` | ERP subtree render errors |
| Global JS handler | `src/core/services/errorLogger.ts` | Unhandled JS + promise rejections |
| Init | `App.tsx` → `installGlobalErrorHandlers()` | Registered at startup |

### Logging errors

```typescript
import { logError } from '@core/services/errorLogger';

void logError(error, 'MyScreen.handleSubmit', { componentStack });
```

Logs are written to:

- Metro / `adb logcat` as `[EduVijna Error]`
- AsyncStorage key `@eduvijna_error_log` (last 40 entries)

### Dev debugging

```javascript
// Metro debugger console
await global.__eduvijnaGetErrors()
await global.__eduvijnaClearErrors()
```

### What boundaries do NOT catch

- Native Android/iOS crashes (Picker, OOM, etc.)
- Errors in async code unless you `logError` or rethrow into React

**Production recommendation:** Add Sentry for native + JS crashes (see team backlog).

---

## 8. Architecture rules for UI

Enforced by `.eslintrc.js`:

```
Screen / Component
  → Hook (useAuth, useTeacherDashboard, useAssessments)
    → Service or API (dashboardApi, sharedApi, auth.api)
      → Axios client (src/core/api/config.ts)
```

| Layer | Can import | Cannot import |
|-------|------------|---------------|
| `src/screens/*` | hooks, components, context, theme | `@core/api`, `@core/store` |
| `src/components/*` | hooks, context, theme | `@core/api` (use hooks) |
| `src/core/hooks/*` | api, services, store | platform code |

---

## 9. Adding a new screen checklist

- [ ] Create screen under `src/screens/` or `src/platforms/mobile/screens/`
- [ ] Use `useTheme()` for all colors
- [ ] Forms with dropdowns → `ModalDropdownField` or `QuizFormFields`
- [ ] Fixed options → pills/chips, not native Picker
- [ ] Register route in `BottomTabNavigator.tsx`
- [ ] API calls via existing hooks/services — not direct axios in screen
- [ ] Wrap risky subtrees in error boundary if large independent module
- [ ] Test on **Android emulator** with keyboard open + typing in text fields
- [ ] Run `npm run lint` before PR

---

## 10. File index

| Topic | Path |
|-------|------|
| Modal dropdown | `src/components/ModalDropdownField.tsx` |
| Quiz form fields | `src/components/QuizFormFields.tsx` |
| Share modal | `src/components/ShareQuizModal.tsx` |
| List filters | `src/components/FilterComponents.tsx` |
| Math rendering | `src/components/MathRenderer.tsx` |
| App error boundary | `src/components/AppErrorBoundary.tsx` |
| Error logger | `src/core/services/errorLogger.ts` |
| Theme | `src/theme/theme.ts` |
| Dropdown context | `src/context/DropdownContext.tsx` |
| Mobile navigation | `src/platforms/mobile/navigation/BottomTabNavigator.tsx` |
| ESLint rules | `.eslintrc.js` |
| Visual design tokens | `DESIGN_SYSTEM.md` |
| Full architecture | `SKILLS.md` |

---

## Login screen

| Rule | Detail |
|------|--------|
| Do **not** use global `isLoading` to hide the whole app during login | Unmounts `NavigationContainer` and can crash Android production builds |
| Use `isInitializing` | App splash — first auth check only (`App.tsx`) |
| Use `isLoggingIn` | Sign-in button spinner (`Login.tsx`) |
| Show API errors | `useAuth.login` sets `error` string for wrong password / network |
| Log failures | `logError(e, 'LoginScreen.onLogin')` |

**Files:** `src/platforms/mobile/screens/Login.tsx` · `src/core/hooks/useAuth.ts` · `App.tsx`

---

## Changelog

| Date | Change |
|------|--------|
| Jul 2026 | Login fix: do not unmount NavigationContainer during submit; use `isInitializing` vs `isLoggingIn` |
| Jul 2026 | Initial doc: native Picker removal, `ModalDropdownField` standard, error logger, assessment module map, ESLint guard |
