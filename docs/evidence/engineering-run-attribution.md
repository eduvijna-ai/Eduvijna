# Engineering run attribution (PR #26)

## What counts as current-build evidence

| Field | Meaning |
| --- | --- |
| `runAt` | ISO timestamp when the journey/script started |
| `accountRole` | e.g. `instructor` for founder fixture journeys |
| `runnerGitHeadSha` | Git HEAD in the PR worktree when the runner executed |
| `bundleProbe.loadedBuildSha` | SHA string embedded in the Metro bundle (when `EXPO_PUBLIC_GIT_SHA` / app config supplies it) |
| `bundleProbe.markerFound` | Bundle contains `curriculum-generated-preview-v1` — **feature presence only**, not a unique revision |

**Historical runs** (e.g. Journey B logged under `0472b67` or `d87d724` before a re-run) must not be cited as current-build results.

## Where recorded

- Android journeys: `.dev-api-document-workflow-run/runtime-evidence/android-journeys/meta.json` (sanitised; no credentials)
- Verify bundle only: `node scripts/verify-engineering-bundle.mjs`

## Before claiming Journey B pass

1. `runnerGitHeadSha` equals the commit you intend to ship.
2. Dev client reloaded on Metro **8082** after that commit.
3. `meta.json` for **this** run shows matching `runAt` and journey `journey-b.json` from the same folder.
