# Phase 4 — Role / profile behavior and unwanted popups

Branch: `feat/mobile-phase4-role-profile-popups` (planned stack after Phase 3).

## Scope

- Align mobile role detection with `GET /api/v1/auth/profile` (same as web `loadProfile`).
- Gate teacher-only vs student-only screens; no cross-role API calls that web would not make.
- Audit and remove duplicate login success / environment / debug alerts not present on Quiz-React.

## Status

Documentation seed only — implementation pending.
