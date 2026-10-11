# Mobile stack defect ledger (Codex + completion pass)

| ID | Finding | Owning PR | Fix location | Regression test | Status |
|----|---------|-----------|--------------|-----------------|--------|
| 18a | Attempt-list lookup failure rejected before immutable recovery | #18 | `assessmentQuizStart.service.ts` | `assessmentsAssignedQuizStart.navigation.test.ts` | Fixed |
| 18b | Expired/upcoming/inactive counted as active pending | #19 | `studentAssignmentClassification.ts`, dashboard store stats | `studentAssignmentClassification.test.ts` | Fixed |
| 18c | Completed metrics fabricated correct counts without keys | #18 | `completedQuizMetrics.ts`, `studentCheckRecordDashboardLoader.ts` | `completedQuizMetrics.test.ts`, loader test | Fixed |
| 19a | Student assignment store not reset on logout / account change | #19 | `studentAssignmentDashboard.store.ts`, `useAuth.ts`, `dataLoader.ts` | `studentAssignmentDashboard.store.test.ts` | Fixed |
| 19b | Late fetch repopulates after account switch | #19 | `beginLoad` / `commitLoad` in dashboard + Assessments | store test | Fixed |
| 19c | Trace redaction in free text | #19 | `scripts/lib/trace-redact.mjs` | `trace-redact.test.mjs` | Fixed |
| 21a | Browser multipart centralization | #21 | `documentUploadMultipart.ts`, `documentUploadApi.ts` | `documentUploadApi.multipart.test.ts` | Verified on HEAD |
| 21b | Diagnostic identity regression (file+code+message) | #21 | `diagnostic-identities.mjs`, `stack-validate-pr-branches.mjs` | `diagnostic-identities.test.mjs` | Fixed |
| 22 | Profile/notification verifier artifact stale | #22 | `scripts/dev-api-profile-notification-verify.mjs` | `devApiProfileVerify.script.test.ts` | Run pending on CI agent |
| 24a | Web `quiz_graded` routed via generic session open | #24 | `WebNavigation.tsx` | `webNavigationNotification.test.tsx` (extend) | Fixed |
| 24b | Push receipt on device | — | native pipeline | Founder emulator | Device verification |

**Evidence:** commit SHAs on each branch HEAD after push; redacted fixtures under `docs/development/e2e-fixtures/`.
