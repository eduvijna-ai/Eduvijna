# Mobile founder program - requirement checklist

Last updated: 2026-10-10 (Cursor). API: `https://dev-api.eduvijna.com` only.

**Stack:** [#18](https://github.com/eduvijna-ai/Eduvijna/pull/18) -> [#19](https://github.com/eduvijna-ai/Eduvijna/pull/19) -> [#21](https://github.com/eduvijna-ai/Eduvijna/pull/21) -> [#22](https://github.com/eduvijna-ai/Eduvijna/pull/22) -> [#23](https://github.com/eduvijna-ai/Eduvijna/pull/23) -> [#24](https://github.com/eduvijna-ai/Eduvijna/pull/24). Docs [#20](https://github.com/eduvijna-ai/Eduvijna/pull/20).

Quiz-React deployed reference: `31ae140f50ccc79079cdfc8c28f2d03b60fde7` (read-only; sibling `Quiz-React` unchanged).

| ID | Requirement | Implementation PR | Technical verification | Codex review | Founder E2E |
|----|-------------|-------------------|------------------------|--------------|-------------|
| P1a | Assigned quiz PUT->POST + attended-quiz | #18 | Jest + `MOBILE_QUIZ_REACT_REQUEST_PARITY.md` | Requested (see PR) | Pending |
| P1b | Recovery checkpoint + View Results probe | #18 | Jest navigation suites | Requested | Pending |
| P1c | Home Recent Completions -> shared resolver | #18 | `studentHomeViewResults` test | Requested | Pending |
| P1d | Notifications/OpenQuiz -> shared resolver | #18/#19 | Jest + openQuiz | Requested | Pending |
| P1e | Clear stale checkpoint after persistence | #18 | View-results `removeItem` | Requested | Pending |
| P1f | Read-only parity trace | scripts | `mobile-quiz-react-parity-traces.json` | N/A | N/A |
| P2a | Assignment classifier + `has_time_limit` | #19 | `studentAssignmentClassification.test.ts` | Requested | Pending |
| P2b | Ongoing includes in_progress/started | #19 | `quizFilters.ongoing.test.ts` | Requested | Pending |
| P2c | `completed_at` not from due date | #19 | `studentDashboardData` test | Requested | Pending |
| P2d | Correct counts only when verified | #19 | unit tests | Requested | Pending |
| P2e | Shared dashboard list + refresh | #19 | Jest | Requested | Pending |
| P2f | Boundary reclassify + inactive `is_active` untimed | #19 | `reapplyStudentAssignmentClassification.test.ts` | Requested | Pending |
| P2g | Classroom name lookup best-effort | #19 | `studentDashboardData.service.test.ts` | Requested | Pending |
| P2h | camelCase trace redaction | #19 | `trace-redact.test.mjs` | Requested | N/A |
| P3a | Worksheet optional-string API parity | #21 | `worksheetGeneratePayload.test.ts` | Requested | Pending |
| P3b | From Books live workflow | #21 | `document-workflow-verification-redacted.json` **passed** | Requested | Pending |
| P3c | Upload multimodal generate | #21 | **limited** (1x1 PNG -> 0 questions); strict fallback documented | Requested | Pending |
| P3d | Live submission matrix + recovery decoy | #21 | `submission-matrix-redacted.json` **passed** + decoy comparisons | Requested | Pending |
| P3e | Disposable fixture cleanup | #21 | Explicit limitation (no DELETE contract) | Requested | N/A |
| P4a | Profile read/edit/save/refetch all roles | #22 | `profile-notification-verification-redacted.json` **passed** | Requested | Pending |
| P4b | Push prompt once per login | #22 | UI guard (manual E2E) | Requested | Pending |
| P5 | Deep links + web `/openquiz` post-login | #23 | `deepLinkService.test.ts` | Requested | Pending |
| P6a | Web bell -> `handleOpenQuiz` | #24 | `webNavigationNotification.test.tsx` | Requested | Pending |
| P6b | Instructor/admin preview before public branch | #24 | `openQuizHandler.roleRouting.test.ts` | Requested | Pending |
| P6c | Notification API vs client vs device receipt | #22/#24 | API probes in profile-notification script; **no device push receipt** | Requested | Pending |
| P6d | Native push registration paths | #24 | `PushNotificationService` (Android); receipt not in CI | Requested | Pending |
| ERP | ERP notifications | Deferred | — | — | Deferred |
| STACK | Per-PR android/ios/web dev export + TS/ESLint delta | `scripts/stack-validate-pr-branches.mjs` | `stack-validation-report.json` (when run completes) | N/A | N/A |

## Redacted artifacts

| File | Notes |
|------|--------|
| `e2e-fixtures/submission-matrix-redacted.json` | Cross-process matrix; recovery decoy rejected |
| `e2e-fixtures/document-workflow-verification-redacted.json` | From Books + worksheet + share + student visibility |
| `e2e-fixtures/profile-notification-verification-redacted.json` | Reversible profile edits; notification API probes |
| `e2e-fixtures/technical-verification-redacted.json` | Multi-account probes |
| `e2e-fixtures/stack-validation-report.json` | Isolated worktrees; `.stack-export-check/` outputs |

## Founder emulator E2E

**Not issued yet** — pending full device matrix on Metro **8082** after stack validation + Codex sign-off on final HEADs.
