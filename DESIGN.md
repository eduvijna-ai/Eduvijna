
EduVijna Mobile Design System
Product Vision
EduVijna is an AI-Powered School Intelligence Platform combining:
•	School ERP
•	AI Assessments
•	Learning Analytics
•	Parent Engagement
•	Teacher Productivity
•	School Operations
•	Executive Intelligence
The design must communicate:
•	Educational
•	Trustworthy
•	Modern
•	AI Powered
•	Data Driven
•	Premium
Avoid:
•	Generic ERP appearance
•	Banking UI patterns
•	Excessive tables
•	Corporate blue themes
•	Dense layouts
________________________________________
Design Principles
1.	Mobile First
2.	Role Based Experience
3.	Action First Design
4.	AI Visible Everywhere
5.	Minimal Cognitive Load
6.	Data Driven UX
7.	Accessibility First
8.	One Hand Usability
________________________________________
Brand Identity
Primary
#0B5563
Secondary
#0F6D7A
Accent
#12B3C7
Success
#22C55E
Warning
#F59E0B
Danger
#EF4444
Background
#F8FAFC
Surface
#FFFFFF
Border
#E2E8F0
Text Primary
#0F172A
Text Secondary
#64748B
________________________________________
Typography
Font Family (global)
Poppins — geometric sans-serif; matches teacher dashboard reference UI.
Loaded via @expo-google-fonts/poppins in App.tsx (useAppFonts).
Weights in use: 400 Regular · 500 Medium · 600 SemiBold · 700 Bold
Implementation: src/theme/fonts.ts · src/theme/useAppFonts.ts · src/vendor/react-native.ts (Text/TextInput wrapper maps fontWeight → Poppins file).
Welcome / hero greeting pattern
Single line, mixed weight on same baseline:
•	"Welcome," → Poppins Medium (500)
•	User name → Poppins Bold (700)
•	Emoji suffix on same line
•	Subtext below → Regular 14px, rgba white ~88%
Display
32px Bold
Page Title
28px Bold
Section Title
20px SemiBold
Card Title
18px SemiBold
Body
16px Regular
Small Text
14px Regular
Caption
12px Regular
ERP Schools tokens
Module-specific scale in src/erp_schools/theme/tokens.ts (teacherTypography).
Consume via useTeacherTheme() — never hard-code colors in screens.
________________________________________
Spacing System
Base Unit
8px
Allowed
8 16 24 32 40 48
Screen Padding
16px
Card Padding
16px
Section Gap
24px
________________________________________
Border Radius
Buttons
12px
Cards
16px
Inputs
12px
Bottom Sheets
24px
Avatars
50%
Hero top corners (Teacher Home)
24px
________________________________________
Shadows
Light
0 2 8 rgba(0,0,0,0.05)
Medium
0 4 16 rgba(0,0,0,0.08)
Avoid heavy shadows
________________________________________
Layout Rules
Every screen:
Header
Content
Bottom Navigation
Scrollable Content Area
Safe Area Support
________________________________________
Header Pattern
Logo
Page Title
Notification Icon
Profile Avatar
Optional Search
Global app header (CustomHeader) — single bar for entire mobile app
File: src/platforms/mobile/navigation/BottomTabNavigator.tsx (CustomHeader)
Used on main dashboard, all main tabs, ERP Schools module, and overlay tabs (Notifications, Profile).
Left → right: Hamburger (side nav) · EduVijna logo · School name pill · Plus (create assessment) · Notifications · Profile avatar.
Logo tap: always navigates to main Dashboard tab (center) via navigateToAppMainTab().
Dashboard tab icon: speedometer (not home).
Dark/light theme toggle: removed from navbar — lives in Profile → Preferences → Dark Mode switch.
Layout: reduced left padding; logo ~108×40px.
TeacherTopBar (deprecated): do not use — Schools tab screens rely on CustomHeader from host tab navigator.
ERP Schools stack detail screens: CustomHeader (host) + ScreenHeader (back + title in content) when pushed.
________________________________________
Hero Card
Use on all dashboards.
Contains:
Greeting
Role Context
Primary KPI
AI Insight
CTA
Gradient
#0B5563 → #0F6D7A
Teacher Home hero (implemented variant)
Full-width solid primary teal (not gradient) for welcome strip.
Rounded top-left / top-right 24px.
Large logo watermark on right (~12% opacity).
Overview metrics card overlaps hero bottom by ~72px (layered rich UI).
________________________________________
Class Context Banner
Used atop class-scoped screens (Study Material, Timetable, Reports, Parent Communication, Notice Board, Mark Attendance, etc.).
Component: src/erp_schools/components/ClassContextBanner.tsx
Structure:
•	Solid primary teal background, 16px radius, overflow hidden
•	White circular badge (left) — class code e.g. "8-A" in primary teal text
•	Title: class name (white, bold ~17px)
•	Meta: "Subject • Room" (white ~90%, 13px)
•	Optional row: people icon + "N Students"
•	Optional right: time range (attendance screens)
•	Book/logo watermark on right (~14% opacity)
Do not wrap in SurfaceCard or use SVG gradient for this banner — solid fill only.
________________________________________
Dashboard Structure
Header
Hero Card
Overview Metrics
Quick Actions
AI Insights
Activity Feed
Recent Items
Bottom Navigation
________________________________________
Quick Actions
Teacher Home: 4-column grid (8 tiles, 2 rows).
Other screens: 2 or 4 columns as needed.
120px Height (approx per tile)
Icon (colored circle on soft tint)
Label
Action
________________________________________
Cards
All information displayed using cards.
Never use large tables.
Cards must include:
Title
Value
Action
Optional Trend
________________________________________
AI Components
Available on:
Student
Parent
Teacher
Principal
Admin
Management
AI Card Contains:
Insight
Recommendation
Action Button
Confidence Indicator
________________________________________
Navigation
Bottom Navigation
Maximum 5 Items
Floating Action Button optional
Main app (host) bottom tabs (left → right)
Analytics · Assessments · Dashboard (center, initialRouteName) · ERP · Schools (instructor only)
Dashboard tab icon: speedometer-outline / speedometer (active).
Tab back behavior: backBehavior="initialRoute" — Android back from Notifications/Profile returns to Dashboard (not first tab).
App side nav (left drawer)
Same five destinations; order matches tabs. Hamburger only in CustomHeader.
ERP Schools teacher bottom tabs (nested inside Schools — host bottom bar hidden)
Home · Classes · Dashboard (center) · Students · More
Center Dashboard tab = escape to main app Dashboard (not an in-module screen).
Reports removed from tabs — reachable via More → Academics and Home quick action.
Schools tab shows host CustomHeader above teacher content (no separate TeacherTopBar).
________________________________________
Charts
Allowed
Line Chart
Bar Chart
Donut Chart
Progress Chart
Avoid
Pie Charts
3D Charts
________________________________________
Forms
Single Column
Large Touch Targets
Inline Validation
Progressive Disclosure
________________________________________
Accessibility
WCAG AA
48px touch targets
Dynamic Font Support
High Contrast Support
________________________________________
Empty States
Illustration
Message
Primary CTA
Secondary CTA
________________________________________
Loading States
Skeleton Loaders
Card Placeholders
Progress Indicators
Font loading gate
App shows ActivityIndicator until Poppins loads (AppWithFonts in App.tsx).
________________________________________
Future Support
Dark Mode
Tablet Layout
Offline Mode
Multi Language
AI Copilot
________________________________________
Module Implementation Notes (ERP Schools)
Path: src/erp_schools/
Reference screenshots: assets/teachers_screens/
Isolation: must not import from src/erp/ — sibling module only.
Data: mock fixtures in erp_schools/data/ until API layer is added.
Theme hook: useTeacherTheme() merges ThemeContext isDark with teacherPalettes from tokens.ts.
Host integration: ERPSchools tab uses CustomHeader (headerShown not disabled); TeacherScreen has no duplicate top safe-area padding.
Screen scaffold: TeacherScreen (content + optional ScreenHeader for stack flows only).
