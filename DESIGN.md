
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
Logo tap: always navigates to main app Home tab (center; route name `Dashboard`) via navigateToAppMainTab().
Main app Home tab: label **Home**, icon home-outline / home (route `Dashboard` — do not rename route).
Side nav drawer: third item label **Home**, icon home-outline (same destination as main Home tab).
Dark/light theme toggle: removed from navbar — lives in Profile → Preferences → Dark Mode switch.
Layout: reduced left padding; logo ~108×40px.
TeacherTopBar (deprecated): do not use — Schools tab screens rely on CustomHeader from host tab navigator.
ERP Schools stack detail screens: CustomHeader (host) + ScreenHeader or StudentIdentityHeader (back + title in content) when pushed.
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

Admin Home hero (implemented variant — June 2026)
Same solid teal strip + logo watermark pattern as teacher/student.
Greeting: "Welcome," (medium) + admin name (bold) + 👋.
School overview card overlaps hero (~72px): 4 KPI metrics with dividers.
Today's Alerts: 2×2 tinted stat grid (tap → relevant stack screen).
Quick Actions: 4×2 grid (Students · Teachers · Classes · Exams · Fees · Announcements · Reports · Settings).
Live row: Attendance pulses (mini donuts) + Fee Collection donut with legend.
Sections: AI Insights · Pending Approvals · Upcoming Events · AI Assistant CTA.
Reference: assets/admin_screens/admin home screen.png
Mobile UX note: desktop reference tables converted to StatGrid + ListItem cards; dense KPI walls grouped with "View All" links.

Student Home hero (implemented variant)
Same solid teal strip + watermark pattern as teacher.
Greeting: "Hello, {name} 👋" with mixed Poppins Medium/Bold weights.
Identity card overlaps hero (~64px): avatar, name, class, roll chip, View Profile.
Stats row: 3 equal columns (Attendance · Avg Marks · Class Rank).
Progress banner: full-width row below stats (star + "Good Progress · Keep it up!") — not a fourth stat column.
________________________________________
Admin list / directory pattern (implemented)
Desktop reference tables → searchable ListItem directories with FilterChips.
People screens: StatGrid KPIs + donut/bar charts + at-risk or performance sections.
Operations screens: StatGrid + OpsList (icon · title/subtitle · trailing badge).
Finance: fee records as ListItem cards with status badges (not data tables).
Permissions: grouped Switch toggles inside SurfaceCard sections.
Announcements: category IconTabs + pinned card layout (not table rows).
Admin-local composites: src/erp_schools/screens/admin/components.tsx
(DistributionList · DonutLegend · CriteriaList · RankedList · OpsList · PersonStatusBadge)
Do not add these to the shared component barrel — keep admin-specific layouts module-local.
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
Student Home: 4-column grid (8 tiles, 2 rows).
Admin Home: 4-column grid (8 tiles, 2 rows).
Other screens: 2 or 4 columns as needed.
Component: src/erp_schools/components/QuickActionGrid.tsx
120px Height (approx per tile)
Icon (colored circle on soft tint)
Label: 9px SemiBold, single line, adjustsFontSizeToFit (min 0.85) — fits "Assignments" on one line
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

Naming convention (June 2026 — important)
Home = main app dashboard (route `Dashboard`, home icon) — host bottom tab, side nav, persona escape hatch.
Dashboard = ERP Schools module home (speedometer icon) — TeacherHome / StudentHome / AdminHome in persona tab bars.

Main app (host) bottom tabs (left → right)
Analytics · Assessments · Home (center, initialRouteName; route `Dashboard`) · ERP · Schools (instructor + student + admin)
Home tab icon: home-outline / home (active).
Schools tab: instructor, student, admin, super_admin, or role_id 1, 2, or 4.
Tab back behavior: backBehavior="initialRoute" — Android back from Notifications/Profile returns to Home tab (not first tab).

App side nav (left drawer)
Analytics · Assessments · Home · ERP · Schools (Schools item instructor-only in drawer config).
Home uses home-outline icon; maps to route `Dashboard`.

ERP Schools teacher bottom tabs (nested — host bottom bar hidden)
Dashboard · Classes · Home (center escape) · Students · More
Dashboard tab = TeacherHomeScreen (module home, speedometer icon).
Center Home tab = escape to main app Home (not an in-module screen).
More tab icon: grid / grid-outline.
Reports removed from tabs — reachable via More → Academics and Home quick action.

ERP Schools student bottom tabs (nested — host bottom bar hidden)
Dashboard · Academics · Home (center escape) · AI Test · More
Dashboard tab = StudentHomeScreen (module home, speedometer icon).
Center Home tab = escape to main app Home.
AI Test tab = AITutorScreen (sparkles icon); practice/quiz pushed on stack.
More tab icon: grid / grid-outline (matches teacher).
Notices removed from tabs — stack screen `Notices`; reachable from Home quick action / announcements.

ERP Schools admin bottom tabs (nested — host bottom bar hidden)
Dashboard · People · Home (center escape) · Finance · More
Dashboard tab = AdminHomeScreen (module home, speedometer icon).
People tab = PeopleHubScreen (hub to student/teacher/parent/staff/roles).
Center Home tab = escape to main app Home (not an in-module screen).
Finance tab = FinanceDashboardScreen (wallet icon).
More tab icon: grid / grid-outline.
Operations (attendance, library, transport, hostel, inventory) and academics reachable via More menu or Home quick actions — not bottom tabs.

Student detail header pattern
Component: StudentIdentityHeader — solid teal banner, back arrow, title, overlapping white identity card (avatar, name, class, roll, optional AcademicYearPill).
Used on: Attendance, Academics, Timetable, Fee, Assignments detail flows, etc.
IconTabs: scrollable underline tabs with optional stacked icons (Academics sub-views, Notices categories).

Schools tab shows host CustomHeader above persona content (no separate TeacherTopBar).
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

DonutChart center labels (implemented)
Component: src/erp_schools/components/DonutChart.tsx
Center value/label constrained to inner hole diameter (size − strokeWidth × 2 − inset).
Long values (e.g. ₹15.15L) use adjustsFontSizeToFit + minimumFontScale 0.6 so text never touches the ring.
Used in: Admin Home fee collection, attendance distributions, finance analytics, admin DonutLegend composite.
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
Reference screenshots: assets/teachers_screens/ · assets/student_screens/ · assets/admin_screens/
Personas: Teacher (complete) · Student (UI complete, mock data) · Admin (UI complete, mock data) · Parent / Principal (planned)
Isolation: must not import from src/erp/ — sibling module only.
Data: mock fixtures in erp_schools/data/ (teacher), data/student/, data/admin/ until API layer is added.
Read seams: useTeacherData() · useStudentData() · useAdminData() — screens never import fixtures directly.
Session / routing: useTeacherSession().persona → SchoolsTabEntry branches AdminStack / StudentStack / TeacherStack.
Theme hook: useTeacherTheme() merges ThemeContext isDark with teacherPalettes from tokens.ts (shared across all personas).
Host integration: ERPSchools tab uses CustomHeader (headerShown not disabled); TeacherScreen has no duplicate top safe-area padding.
School pill in CustomHeader: fetched via /my-school for school-level admin (role admin / role_id 2); only platform super-admin skips.
Screen scaffold: TeacherScreen (content + optional ScreenHeader for stack flows).
Student detail header: StudentIdentityHeader (teal banner + identity card).
Admin detail screens: ScreenHeader (back + title) — no StudentIdentityHeader.
UI stores: teacherUI.store.ts · studentUI.store.ts · adminUI.store.ts (ephemeral selections only).
Analysis docs: STUDENT_MODULE_ANALYSIS.md · ADMIN_MODULE_ANALYSIS.md · ADMIN_UX_REVIEW.md · ADMIN_INFORMATION_ARCHITECTURE.md
