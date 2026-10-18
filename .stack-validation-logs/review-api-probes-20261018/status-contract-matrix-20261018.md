# Status contract matrix (role × page × entity)

Verified: live web Network on `https://dev.eduvijna.com/analytics` as `demo_samatha` (instructor) + Quiz-React source + authenticated `dev-api` membership probe.  
Student/admin UI live drill: **partial** (student account not exercised in browser this pass; admin shares instructor AnalyticsPage on web).

## Instructor / teacher (live verified on web Analytics)

| Page / level | Entity | Endpoint | Status source | Labels | Rule |
|---|---|---|---|---|---|
| Assessments tabs | Assignment | `view_type=summary` | `availability_status` | Active / Upcoming / Expired | Filter by availability; Upcoming includes `coming soon` |
| Assessments card footer | Submission slots | same rows | `completed_count`, `pending_count` | Completed / Pending | Ungated cohort |
| Analytics class card | Assignment count | `view_type=all` | row count | Total Quizzes | `total_quizzes` |
| Analytics class card | Availability | `view_type=all` | `availability_status` | Active / Upcoming / Expired (mobile) | Assignment buckets |
| Analytics class card | Submissions | `view_type=all` | `completed_count`, `pending_count` | Done / Pending (icons on web) | **Ungated** Σ |
| Analytics class drill | Submissions actionable | same cache | `pending_count` + `availability_status` | Pending (insights) | **Gated** to `active` |
| Analytics quiz attempt chips | Student attempts | `attempts[]` | attempt.status + availability | Completed / Pending / Missed / … | Pending only if active |
| Home KPI Active | Assignments | `view_type=summary` | `availability_status==='active'` | Active | Assignment count |

## Student (code + prior probes; browser this pass: unverified)

| Page / level | Entity | Endpoint | Source | Labels | Rule |
|---|---|---|---|---|---|
| Assessments tabs | Student assignment | student dashboard | derived attempt status | Ongoing / Completed / Missed | Student classifiers |
| My Analytics | Quiz rows | `student_total_details` | `student_status` / `quiz_status` | Done / Pending / Missed | Explicit `mode:'student'` |
| Null score | Attempt | same | status completed, score null | Completed, score — | Must not become pending |

## Admin

Web Analytics uses same `AnalyticsPage` as instructor (extra school KPIs). Mobile shares `QuizTeacherAnalyticsScreen`. **Admin-specific drill live: unverified.**

## Known web split (intentional product)

Class **card** Pending = ungated. Class **drill** / attempt chips Pending = active-gated. Mobile must preserve both, not collapse into Active.
