# Student dashboard, teacher analytics and startup fixes

Base: phase6 commit `2f308ee0083613eab6c28b3f68518ad578bb5dc1`.

## Findings and changes

- The attached student log already reports `isAuthenticated: true`. Rendering then throws `ReferenceError: Property 'allQuizzes' doesn't exist` in StudentDashboard. Replace the stale loading guard with classifiedQuizzes and memoize classification from stable store fields. Include authentication in the fetch callback dependencies.
- The actual AnalyticsQuizCard invokes its callback with `(quizId, quizName)`. QuizTeacherAnalyticsScreen passed a handler expecting an object, so selectedQuiz became undefined and existing attempts appeared empty. Adapt the callback arguments. Match the web reference request limit of 500 rather than 100.
- useAppFonts previously hid the native splash only on success, although AppWithFonts also proceeds on font error. Hide on either outcome and hold the splash at module initialization, avoiding the cached-font effect race. This is a startup defect found in source; the attached logs do not establish that font failure caused the reported emulator hang.

Web reference read: `eduvijna-ai/Quiz-React`, AnalyticsPage.tsx at deployed reference `31ae140f50ccc79079cdfc8c28f2c2d03b60fde7`. Its handleQuizSelect takes a numeric quiz ID and a name; it requests view_type=all, limit=500. No web or backend source changed.

## Verification

- npm ci succeeded.
- Three new regression suites against original source: 4 failures / 3 passes. They expose the undefined allQuizzes reference, empty drilldown after the real card tap, and splash not hidden on font failure.
- Fixed source: 11 suites, 35 tests passed, covering new render/drilldown/font tests plus student stats/store/loader, notification routing/pagination, immutable recovery and deep-link policy.
- Android development export succeeded using `node scripts/with-eduvijna-api-env.mjs development -- expo export --platform android --output-dir .expo-export-check/android-fix` after final code changes.
- npm run config:verify passed: development resolves to dev-api, production resolves to eduapi, invalid and conflicting selectors are rejected.
- git diff --check passed.
- Full npm run type-check failed with repository diagnostics, including existing DashboardStats property mismatches and unrelated screen errors. This is not a clean repository-wide type-check result.

## Outstanding device verification

This environment has no adb, Android emulator or connected phone. No native launch, physical device login, or live teacher/web numeric parity is claimed. Android export proves bundling, not successful app execution. The existing stack completion gates remain open.

For the local device workspace, apply this fix commit without discarding WIP. Start the intended development build using `npm run start:device -- --clear --port 8082` and confirm the app connects to that Metro server. The attached log was connected to port 8081; the prior ledger identifies 8082, so verify the actual checkout and server rather than assuming the running bundle contains this fix. For an emulator over USB/adb, reverse the chosen port with `adb reverse tcp:8082 tcp:8082` and launch the development client using its corresponding localhost URL. A physical phone over LAN must reach the computer's LAN IP and chosen port.

Verify student login reaches Home; reopen after force-close with a saved student session; then teacher Analytics > Class > View Analytics renders the correct quiz and attempts. Compare the same account, API environment, class, quiz and applied date range with the web app. Recheck after logout/account switch. Do not treat Metro 100% as a device execution pass.
