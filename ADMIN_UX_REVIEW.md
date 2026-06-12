# ADMIN_UX_REVIEW.md — ERP Schools Admin Reference UX Review

> **Reference set:** `assets/admin_screens/` (13 screens)
> **Goal:** Evaluate each reference for **mobile** usability and decide what to implement, adapt, or improve. References are **inspiration, not spec** — original intent is preserved, mobile experience is improved where the mock is desktop-dense.
> **Design system:** `DESIGN.md` (Poppins, teal `#0B5563`, cards-not-tables, ≤5 tabs, 48px targets, one-hand use).

## Cross-cutting findings (apply to all screens)

**Strengths of the reference set**
- Strong visual hierarchy; consistent teal brand; good use of donut/bar charts and tinted stat cards.
- "AI Insights" is surfaced throughout — aligns with DESIGN.md "AI visible everywhere".
- Date-range pill + Export are consistent affordances.

**Recurring mobile weaknesses & global fixes**
1. **Inconsistent bottom tabs across mocks** (`Dashboard·Academics·Finance·AI·More`, `Dashboard·Students·Academics·Reports·More`, etc.). → **Fix:** one stable 5-item bar `Dashboard · People · Home · Finance · More` (center Home = host escape, matching Teacher/Student). Everything else lives in Dashboard quick actions + **More** hub.
2. **Wide data tables** ("Teacher Details", "Fee student table" with columns + pagination `1 2 3 … 25`). → **Fix:** convert to **card/list rows** (`ListItem`) with the key fields + chevron to detail; replace numbered pagination with infinite/section lists and search+filter.
3. **8+ stat cards above the fold** (School/Student Overview). → **Fix:** show 4 primary KPIs in a 2×2 `StatGrid`; push the rest into the relevant section ("View All").
4. **In-page horizontal tab strips with 7 tabs** (School Overview: Overview/Academics/Attendance/Finance/Students/Teachers/Infrastructure). → **Fix:** keep the **scrollable `IconTabs`** but make each section a deep-linkable destination from Dashboard too, so users aren't forced to scrub a 7-tab strip on a phone.
5. **Tiny multi-column heatmaps** (Grade-wise attendance heatmap). → **Fix:** render as a horizontally scrollable compact grid with adequate touch/legibility, or a per-grade list with a colored % pill on small screens.
6. **Dense right-aligned icon clusters** (view/calendar/mail per teacher row). → **Fix:** single row tap → detail; secondary actions move into the detail screen / long-press menu.

---

## 1. Admin Home (`admin home screen.png`) → `AdminHomeScreen`
**Purpose:** Operational command center — greeting, school overview KPIs, today's alerts, quick actions, live attendance, fee collection, AI insights, pending approvals, upcoming events, AI assistant CTA.
**Strengths:** Excellent at-a-glance density; alerts with counts; quick actions grid; AI insight card.
**Weaknesses (mobile):** Very long; 4 KPI + 3 sub-KPI + 4 alert + 8 actions + 2 charts + AI + approvals + events + AI banner = heavy scroll.
**Mobile usability:** Content slightly overcrowded; scrolling long but acceptable for a "home". Actions discoverable; hierarchy clear.
**Recommended improvements (implemented):**
- Welcome hero (teal, watermark, mixed-weight greeting) consistent with Teacher/Student home.
- Overview = overlapping card with **4 KPIs** (Students / Teachers / Classes / Attendance) + a secondary 3-up mini-row; "View Full Report" → `SchoolOverviewScreen`.
- "Today's Alerts" = 2×2 tappable alert cards (count + label + "View Details").
- Quick Actions = 4-col grid (Students, Teachers, Classes, Exams, Fees, Announcements, Reports, Settings).
- Live Attendance + Fee Collection summarized with `DonutChart`s; AI Insights as a list; Pending Approvals → `ApprovalWorkflowScreen`; Upcoming Events list.
- Sticky AI Assistant card at bottom.

## 2. School Overview – Full Report (`admin school overview screen.png`) → `SchoolOverviewScreen`
**Purpose:** Whole-school report with 7 tabbed sections + export/share.
**Strengths:** Comprehensive; good charts.
**Weaknesses (mobile):** 8 KPI cards + 7-tab strip + 4 large stacked sections is desktop-grade density.
**Mobile usability:** Overcrowded; excessive scroll; the 7-tab strip is hard to scan one-handed.
**Recommended improvements (implemented):** Keep a scrollable `IconTabs` (Overview/Academics/Attendance/Finance/Infrastructure) but default to **Overview** with the donut + trend + 4 KPI grid; each section is concise (a chart + a short stat row). Export/Share as a sticky footer with two `PrimaryButton`s.

## 3. Student Overview (`admin student overview screen.png`) → `StudentManagementScreen`
**Purpose:** Student analytics + at-risk + enrollment trend + grade distribution + recent admissions + AI insights.
**Strengths:** Rich student intelligence; at-risk breakdown is valuable.
**Weaknesses (mobile):** Heatmap + multiple donuts + several lists is long.
**Mobile usability:** Hierarchy ok; heatmap is the main legibility risk.
**Recommended improvements (implemented):** Top KPI grid (Total/Present/Absent/New Admissions), enrollment as `BarChart`, "Students by Grade" donut, "Students at Risk" as a list with risk pills, grade-wise attendance as a compact scrollable grid, recent admissions list, AI insight banner. Search/filter at top; rows → (future) student detail.

## 4. Teacher Overview (`admin teacher overview screen.png`) → `TeacherManagementScreen`
**Purpose:** Staff analytics, attendance, performance, on-leave, teacher directory table.
**Strengths:** Performance-by-criteria bars; leave visibility.
**Weaknesses (mobile):** The "Teacher Details" **table** (columns + per-row icon cluster) does not fit a phone.
**Mobile usability:** Table = poor; rest is fine.
**Recommended improvements (implemented):** KPI grid, attendance donut, performance distribution donut, performance-by-criteria as labelled `ProgressBar`s, "Teachers on leave" list, and the directory as **`ListItem` cards** (avatar, subject, classes, % , status pill) with `SearchBar` + `FilterChips` (department/status) — no table, no pagination widget.

## 5. Academic Overview (`admin academic overview screen.png`) → `AcademicOverviewScreen`
**Purpose:** Academic KPIs, performance trend, grade-wise marks, subject performance, distribution, top classes, at-risk, recent reports.
**Strengths:** Good academic storytelling.
**Weaknesses (mobile):** Many chart blocks stacked.
**Recommended improvements (implemented):** KPI grid (Pass %, Avg Marks, Assessments, At-Risk), grade-wise `BarChart`, subject performance as `ProgressBar` rows, distribution donut, top-performing classes ranked list, recent reports list → `AcademicReportsScreen`.

## 6. Finance Overview (`admin finance overview screen.png`) → `FinanceDashboardScreen` (Finance tab)
**Purpose:** Finance KPIs, collection trend, distribution donut, fee-type breakdown, recent transactions, concessions, outstanding dues.
**Strengths:** Clear money hierarchy; donut + trend.
**Weaknesses (mobile):** Long; transaction "table" tendency.
**Recommended improvements (implemented):** Teal finance hero + KPI grid, collection-trend `BarChart`, distribution `DonutChart`, fee-type 2×2 cards, recent transactions as `ListItem` rows, concessions card, outstanding dues card with "View Dues List". Quick links → `FeeCollectionScreen`, `RevenueAnalyticsScreen`, `ExpenseAnalyticsScreen`.

## 7. Fees Management (`admin fee management screen.png`) → `FeeCollectionScreen`
**Purpose:** Track/manage/collect fees; student fee table + status + actions + recent.
**Strengths:** Actionable (Generate Invoice, Send Reminders, Concessions, Export).
**Weaknesses (mobile):** Student **table** with `Class/Due/Status/Amount` columns + pagination.
**Mobile usability:** Table poor; actions good.
**Recommended improvements (implemented):** KPI strip, collection overview (donut + bar), `SearchBar` + `FilterChips` (All Classes / All Status), student fees as **`ListItem` rows** (name, id, class, due, amount, status pill, chevron), `QuickActionGrid` (Invoice/Reminders/Concessions/Export), recent transactions list. No numeric pagination.

## 8. Attendance Analytics (`admin school attandance screen.png`) → `AttendanceDashboardScreen`
**Purpose:** School-wide attendance: KPIs, trend, distribution, class-wise ranking, alerts, teacher attendance, absentees.
**Strengths:** Alerts ("Grade 7-A dropped 8%") are excellent.
**Weaknesses (mobile):** Class-wise "table" + dual trend lines.
**Recommended improvements (implemented):** KPI grid (Student/Teacher present %, absentees, trend), attendance `DonutChart`, class-wise ranking list (rank, class, %, trend arrow), attendance alerts list, teacher attendance summary, absentees avatars row, sticky Export/Share/AI footer.

## 9. Classes (`admin classes screen.png`) → `ClassesScreen`
**Purpose:** Class directory with syllabus progress + timetable toggle + class overview stats.
**Strengths:** Class cards with syllabus % progress are mobile-friendly already.
**Weaknesses (mobile):** Minimal — good reference.
**Recommended improvements (implemented):** `SegmentedControl` (My Classes / Timetable), `SearchBar`, class cards (subject icon, grade/room/teacher/time, grade pill, syllabus `ProgressBar`), bottom "Class Overview" `StatGrid`. "Add / Join Class" `PrimaryButton`.

## 10. Exams (`admin exams screen.png`) → `ExamsScreen`
**Purpose:** Exam KPIs, upcoming/ongoing/recent results, quick links.
**Strengths:** Date-chip rows are clean and mobile-ready.
**Weaknesses (mobile):** None major.
**Recommended improvements (implemented):** KPI grid (Upcoming/Ongoing/Completed/Avg Score), upcoming exams list (date chip, subject, grade, "In N days" pill), ongoing card, recent results list (avg score), quick links grid.

## 11. Announcements (`admin announcements screen.png`) → `AnnouncementsScreen`
**Purpose:** School announcements with category filter + new announcement.
**Strengths:** Category chips + pin + author — clean and mobile-ready.
**Weaknesses (mobile):** None major.
**Recommended improvements (implemented):** `FilterChips` (All/General/Academics/Events/Exams/Transport), announcement cards (category badge, icon, title, body, date/time, author, pin), "New Announcement" `PrimaryButton`.

## 12. Reports (`admin reports screen.png`) → `ReportsDashboardScreen`
**Purpose:** Report hub — quick access, categories, recent, analytics.
**Strengths:** Category cards with counts; recent reports with file-type badge.
**Weaknesses (mobile):** 6-up quick access slightly tight.
**Recommended improvements (implemented):** `QuickActionGrid` quick access (Academic/Attendance/Finance/Student/Teacher/Custom), report-category cards (title, description, N reports) → first opens `AcademicReportsScreen`, recent reports list (PDF/Excel badge + download/share), reports analytics `StatGrid`.

## 13. Academic Reports (`admin academic reports screen.png`) → `AcademicReportsScreen`
**Purpose:** Academic report catalog + quick access + recent.
**Strengths:** Clear report list with type badges.
**Weaknesses (mobile):** None major.
**Recommended improvements (implemented):** KPI grid (Total/Scheduled/Downloaded/Shared), quick access `QuickActionGrid`, academic report rows (icon, title, description, type badge, chevron), recently generated list.

---

## Reuse report (components used per screen) — see `ADMIN_MODULE_ANALYSIS.md §3`
Every screen above is built **only** from the existing shared barrel (`TeacherScreen`, `ScreenHeader`, `SurfaceCard`, `SectionHeader`, `StatGrid`, `QuickActionGrid`, `ListItem`, `Avatar`, `Badge`/`StatusPill`, `SearchBar`, `FilterChips`, `SegmentedControl`, `IconTabs`, `ProgressBar`, `DonutChart`, `BarChart`, `EmptyState`, `InfoBanner`, `PrimaryButton`). **No new shared component was required**, and **no reference table or numeric-pagination control was copied** — all converted to mobile-first card/list patterns.
