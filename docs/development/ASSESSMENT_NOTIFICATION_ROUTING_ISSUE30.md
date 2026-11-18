# Issue #30 — Assessment notification routing implementation handoff

## Baseline and scope

- Mobile repository: `eduvijna-ai/Eduvijna`
- Base: `main` at `327010f8be07f44ef6e924fb06ae55c300e449ea`
- Implementation branch: `feat/mobile-assessment-notification-routing-issue30`
- Prior Founder-accepted TestFlight: iOS `1.0.5 (1.0.14)`
- Existing general/self-test, signed-out, background and terminated-app notifications must keep working.

This branch does **not** merge, deploy, build a binary or alter production data.

## Existing backend FCM contract (read-only source verification)

Repo: `eduvijna-ai/eduvijna-api`.

- `app/api/v1_dashboard/v1_dashboard_controller.py` builds `quiz_assigned` event data with `quiz_id`, `classroom_id`, `session_id`, `event_key` and compatibility aliases, targeting enrolled students.
- The same controller builds `quiz_completed` with `student_id`, `attempt_id`, `session_id`, `classroom_id` and `event_key`, targeting the instructor.
- `app/services/push_notification_service.py` stringifies custom data and sends through `FCMProviderAdminSDK`.
- `app/utilities/push_providers/fcm_provider_admin_sdk.py` uses platform-specific Android/APNs presentation with custom `data` attached.
- `quiz_graded` exists in notification templates, **but no automatic grade-event publisher was identified** in the reviewed backend source. A real graded event cannot be considered end-to-end implemented until its originating workflow is verified or separately implemented.

## Implementation

- Assignment taps now confirm the authenticated student's check-record session, quiz and classroom identity before opening the existing `handleOpenQuiz` flow. Unmatched/missing/backend-unavailable records fall back to Assessments.
- Student graded taps use the **authenticated user ID**, not an untrusted `student_id` from the push. They require a server-confirmed **completed** assignment. Explicit session/classroom hints are verified; ambiguous quiz-only notifications fall back to Assessments rather than guessing.
- Instructor completion taps check class ownership, enrolled student, and matching assessment through the instructor's authenticated dashboard endpoints before navigating to teacher-view Results. Other roles fall back to Assessments.
- Backend `event_key` is preserved for deduplication across varying APNs/FCM request IDs.
- Full notification intent is queued before authentication or navigation readiness; the session-only post-login resume is not also invoked. The queued intent is stored briefly in AsyncStorage (30-minute TTL) with no tokens/credentials or names, revalidated after login, and cleared after consumption.
- General/self-test notifications still route to the existing Main → Notifications screen. Unknown event types are **not** interpreted as assessment events just because a session ID appears.

## Review and acceptance gates — not claimed passed by this handoff

GitHub code edits were made through the connector; no Windows/macOS mobile toolchain or physical iPhone was available in this session. New tests are committed but **not executed**. Run in an authorized local engineering worktree:

1. `npm ci`, `npm run config:verify`, and `npm run test:ios-fcm-config`.
2. `npx jest --runInBand src/__tests__/assessmentNotificationAccess.test.ts src/__tests__/gradedNotificationRouting.test.ts src/__tests__/appPushNotificationResponse.test.ts src/__tests__/mobilePendingNotificationStorage.test.ts src/__tests__/pendingNotificationIntent.test.ts src/__tests__/pushNotificationNestedNavigation.test.tsx`.
3. `npm run test:journey-logic`; Android push-path regression suites; compare `tsc --noEmit` output against main baseline.
4. iOS production JavaScript export using the production configuration; do not publish an EAS Update.
5. Backend controlled fixture tests for assignments, completions and graded publisher when available. Never send to real classrooms.
6. Founder physical iPhone: assignment→correct quiz, graded→correct student results, completion→correct instructor result; signed-out/terminated/foreground/background taps and duplicate handling, including wrong-role and ambiguous assignments.

Keep PR draft until automated gates pass; require separate Founder approvals for EAS build, TestFlight upload, production backend changes and merging into main.

## Explicit follow-up blockers

- Physical iPhone assessment-event acceptance is pending.
- Verification/implementation of an actual `quiz_graded` producer is pending in backend.
- The precise response shape of instructor-scoped `view_type=summary` and `class_wise_students` must be exercised against authorized dev test fixtures, as those gates deliberately fail closed.
