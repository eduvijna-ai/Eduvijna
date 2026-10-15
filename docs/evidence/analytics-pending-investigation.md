# Analytics “Pending” investigation (fixture 479 / student 70 / attempt 207)

**Recorded:** engineering acceptance, PR #26. **Tested implementation SHA:** see `loaded-build-identity.json` / journey `meta.json` for the run in question.

## Finding (precise)

1. **API and normalised data:** Attempt **207** for student **70** on assignment quiz **479**, session `a6882262-5c50-4cf5-a4a8-dc8786862916`, classroom `class_4d82c60e` is **`completed`** with score **60** (`canViewSavedResult: true`). Evidence: `docs/evidence/analytics-fixture-trace/fixture-479-70-207.json`.

2. **Failed UI/automation runs:** Instructor-facing UI showed **Pending** or lacked **View Details** because the flow opened a **different assignment** (another session/quiz row on the class quiz list), not because the API marked attempt 207 incomplete.

3. **End-to-end fixture selection:** Correct assignment identity (`quizId` + `sessionId` + `classroomId`) through Analytics → **View Analytics** → **View Details** → saved result (**60%**, **6/10**, saved answers) remains the **acceptance gate**; pagination locates the row for the current dataset (page index is **not** a permanent fixture property).

## What we did not do

- No change to completion classification, backend data, or relabelling attempts to pass tests.
