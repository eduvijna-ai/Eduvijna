# PR #26 founder requirements — engineering acceptance

**Metro:** port **8082** (`scripts/lib/engineering-runtime-target.mjs`)

| Requirement | Implementation | SHA | Android | Web | Evidence |
| --- | --- | --- | --- | --- | --- |
| Normal login | Preserved | prior | Pass | Pass | Prior milestones |
| Journey A 479/70/207 | Nav + retrieval | `13521e6` | Pass (prior) | Pass (prior) | `journey-a.json` |
| Analytics default dates | **Last month → tomorrow** (Quiz-React `AnalyticsPage`, UTC ISO slice) | _pending commit_ | N/A | N/A | `analyticsUiUtils.test.ts` |
| Fixture Aug range | UI date inputs + Apply (`analytics-date-*`) | _pending commit_ | Applied in B runner | Web runner | `journey-b.json` steps |
| Analytics parity totals | `scripts/analytics-parity-compare.mjs` | _pending commit_ | N/A | N/A | `docs/evidence/analytics-parity/instructor-analytics-totals.json` |
| Journey B | Date UI + scoped testIDs + saved result nav | _pending commit_ | **Fail** (quiz 479 View Analytics) | **Fail** (hub timeout) | `journey-b.json` |
| From Books + alignment OFF/ON | Toggle, version, dual API paths | _pending commit_ | Unit | Unit | `books-from-parity-table.md` |
| Math/Markdown surfaces | `EducationalContent` on results; taking/explanations已有 | _pending commit_ | Partial | Partial | Component audit |
| quiz-navigation-items | `useQuizNavScreenAccess` on grid | _pending commit_ | Not E2E | Not E2E | Hook + grid guard |
| Option identity | `optionIdentity.persistence.test.ts` | _pending commit_ | Unit | Unit | Tests |
| Document history / completions | `DocumentUploadHistoryScreen`, student Recent Completions | prior | Screen exists | Screen exists | Service tests |
| Cold launch | `--cold` runner | prior | Not re-run | — | — |
| Physical device push | — | — | **Unverified** | — | Release gate |

## Analytics parity snapshot (instructor, same API)

| Range | Rows | Classes | 4A-Mathematics rows | Fixture 479 row |
| --- | ---: | ---: | ---: | --- |
| Default (last month) | 31 | 3 | 23 | **0** |
| Fixture UI (Aug 1 – Oct 13 2026) | 36 | 3 | 27 | **1** |

**READY FOR FOUNDER EMULATOR E2E:** **No** — Journey B not green; web analytics hub not reached in automation.
