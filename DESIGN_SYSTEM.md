# Eduvijna Design System - UI Standards

## 📐 Standardized Dimensions & Colors

This guide ensures consistent sizing, spacing, and colors across all screens in the Eduvijna application.

---

## 🎯 Stat Cards

**Used in:** Teacher Dashboard, Student Dashboard, Unified Dashboard

### Dimensions
```typescript
borderRadius: 16
padding: 16
elevation: 2
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4

Icon: 32px
Number: 24px (font-size), 700 (font-weight)
Label: 11px (font-size), center-aligned
```

### Light Mode Colors

| Purpose | Background | Icon Color | Usage |
|---------|-----------|------------|-------|
| **Students/People** | `#FFE5F1` (Pink) | `#DC2626` (Red) | Total Students, User counts |
| **Classes/Info** | `#E3F2FD` (Blue) | `#0891B2` (Teal) | Total Classes, Informational |
| **Assessments** | `#FFF3E0` (Orange) | `#D97706` (Orange) | Total Assessments, Warnings |
| **Upcoming/Success** | `#E8F5E9` (Green) | `#059669` (Green) | Upcoming items, Positive states |
| **Special/Website** | `#F3E5F5` (Purple) | `#9C27B0` (Purple) | Special features |

### Dark Mode
- Background: Use `colors.card` (from theme)
- Icon colors: Keep the same bright colors for visibility

---

## 🧩 Quiz Generation Grid

**Used in:** Quiz Generation Component, Dashboards, Assessments, Header Modal

### Section Dimensions
```typescript
paddingHorizontal: 20
paddingTop: 24
paddingBottom: 32
```

### Grid Layout
```typescript
flexDirection: 'row'
flexWrap: 'wrap'
gap: 10
marginTop: 4
```

### Card Dimensions (5 tiles)
```typescript
width: 31% (3 columns)
aspectRatio: 1 (square cards)
borderRadius: 12
padding: 10
elevation: 2
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4
```

### Icon Container
```typescript
width: 44
height: 44
borderRadius: 22 (circular)
iconSize: 28
marginBottom: 6
```

### Text Sizing
```typescript
Title: 13px, font-weight: 700, margin-bottom: 2
Subtitle: 10px, center-aligned
```

### Quiz Option Colors

| Option | Light Background | Icon Background | Icon | Usage |
|--------|-----------------|-----------------|------|-------|
| **AI Assessment** | `#E3F2FD` (Light Blue) | `#0891B2` (Teal) | `bulb` | Topic-based generation |
| **Document** | `#FFE5F1` (Light Pink) | `#DC2626` (Red) | `document` | PDF/Text upload |
| **Image** | `#FFF3E0` (Light Orange) | `#D97706` (Orange) | `image` | Photo/PDF upload |
| **YouTube** | `#E8F5E9` (Light Green) | `#059669` (Green) | `logo-youtube` | Video-based |
| **Website** | `#F3E5F5` (Light Purple) | `#9C27B0` (Purple) | `globe` | URL-based |

---

## 📦 Using Global Styles

### Import
```typescript
import { useGlobalStyles } from '@hooks/useGlobalStyles';
import { useTheme } from '@context/ThemeContext';

const { styles, colors } = useGlobalStyles();
const { isDark } = useTheme();
```

### Available Global Styles
```typescript
styles.statsContainer      // Stat cards container
styles.statCard           // Individual stat card
styles.statIconContainer  // Icon wrapper
styles.statNumber         // Number text
styles.statLabel          // Label text

styles.quizGenerationSection  // Quiz grid section
styles.quizOptionsGrid        // Quiz options grid
styles.quizOptionCard         // Individual quiz card
styles.quizOptionIcon         // Icon container
styles.quizOptionTitle        // Card title
styles.quizOptionSubtitle     // Card subtitle
```

### Color Constants
```typescript
import { STAT_CARD_COLORS, getStatCardBackground } from '@theme/statCardColors';

// Direct usage
backgroundColor: STAT_CARD_COLORS.PINK

// With dark mode support
backgroundColor: isDark ? colors.card : STAT_CARD_COLORS.BLUE
```

---

## ✅ Implementation Checklist

When creating stat cards or quiz options:

- [ ] Use standardized dimensions (padding: 16, borderRadius: 16 for stats)
- [ ] Use standardized colors from the color constants
- [ ] Support dark mode (use `colors.card` for background)
- [ ] Use global styles from `useGlobalStyles()`
- [ ] Maintain consistent spacing (gap: 10-12 for grids)
- [ ] Use elevation: 2 with standard shadows
- [ ] Icon size 28-32px depending on context
- [ ] Text sizes: 24px (numbers), 13px (titles), 10-11px (labels)

---

## 🎨 Color Palette Quick Reference

### Primary UI Colors
- **Background (Dark)**: `colors.background`
- **Card (Dark)**: `colors.card`
- **Text**: `colors.text`
- **Text Secondary**: `colors.textSecondary`

### Accent Colors
- **Red**: `#DC2626` (Error, Students, Critical)
- **Blue**: `#0891B2` (Info, Classes)
- **Orange**: `#D97706` (Warning, Assessments)
- **Green**: `#059669` (Success, Upcoming)
- **Purple**: `#9C27B0` (Special, Website)

### Light Backgrounds (for stat cards in light mode)
- **Pink**: `#FFE5F1`
- **Blue**: `#E3F2FD`
- **Orange**: `#FFF3E0`
- **Green**: `#E8F5E9`
- **Purple**: `#F3E5F5`

---

## 📝 Example Usage

### Stat Card (Teacher Dashboard)
```typescript
<View style={[
  styles.statCard, 
  { backgroundColor: isDark ? colors.card : '#FFE5F1' }
]}>
  <View style={styles.statIconContainer}>
    <Ionicons name="people" size={32} color="#DC2626" />
  </View>
  <Text style={styles.statNumber}>{stats.totalStudents}</Text>
  <Text style={styles.statLabel}>Total Students</Text>
</View>
```

### Quiz Option Card
```typescript
<TouchableOpacity
  style={[
    styles.quizOptionCard, 
    { backgroundColor: isDark ? colors.card : '#E3F2FD' }
  ]}
>
  <View style={[styles.quizOptionIcon, { backgroundColor: '#0891B2' }]}>
    <Ionicons name="bulb" size={28} color="#FFF" />
  </View>
  <Text style={styles.quizOptionTitle}>AI Assessment</Text>
  <Text style={styles.quizOptionSubtitle}>Topic-based</Text>
</TouchableOpacity>
```

---

## 🔄 Migration Status

**Completed:**
- ✅ QuizGenerationGrid component (standardized)
- ✅ Global styles (statsContainer, statCard, quizOptionsGrid)
- ✅ Color constants (statCardColors.ts)
- ✅ TeacherDashboard (using QuizGenerationGrid)
- ✅ StudentDashboard (using QuizGenerationGrid)
- ✅ Assessments screen (quiz generation styles)

**Consistent Across:**
- All dashboard screens use same stat card dimensions
- All quiz creation interfaces use same grid layout
- Dark mode support everywhere
- Icon sizes and spacing standardized
