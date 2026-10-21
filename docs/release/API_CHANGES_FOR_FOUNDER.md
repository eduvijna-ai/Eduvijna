# API Changes for the Founder (Play Data Safety)

Repo: `eduvijna-ai/eduvijna-api` — **read-only for this remediation; implement separately.**
Baseline read: `main@2de33f0`. Production verified live 2026-10-21 (`GET https://eduapi.eduvijna.com/health` → 200, env `production`). No API files were changed.

## 1. Existing relevant endpoints & actual authorization

| Endpoint | Auth (as coded) | Notes |
|---|---|---|
| `POST /api/v1/auth/login`, `/register`, `/forgot-password`, `/reset-password` | Public | `app/api/auth_postgrest.py:697,742`; `app/main.py:416-420`. Password-reset mail links to `{frontend}/reset-password?token=…` (`password_reset_service.py:345`) |
| `GET/PUT /api/v1/auth/profile` | Bearer JWT, own profile | Mobile's profile path (`profile.api.ts`) |
| `DELETE /api/v1/users/{user_id}` (legacy router) | Any authenticated context (`required_auth_context`); handler itself does **no ownership/admin check** (`eduvijna_endpoints.py:3900-3915`) | **Do not expose as self-service.** Either restrict to admin or remove — founder decision; mobile does not call it |
| `DELETE /usermanagement/users/{user_id}` | `Authorize(["admin"])` only (`usermanagement/endpoints.py:278`) | Admin user-delete. **Not** a normal user's self-service deletion — mobile must not (and does not) call it |
| `POST/GET/PUT/DELETE /api/notifications/devices…` | Authenticated user | Push-token lifecycle (`push_notification_controller.py:101-221`); `DELETE /devices/{token_id}` exists for token removal |
| Upload/generation endpoints (`UploadFile`, e.g. `eduvijna_endpoints.py:2811,2971,3045`) | Authenticated | Document/image uploads for OCR/quiz generation |
| Quiz-session / assessment submission endpoints | Authenticated, user-scoped (e.g. `user_assessment_endpoints.py:495`) | Student attempts/scores |

## 2. Is any API change necessary for the reported email issue?

**No.** The Play email issue is a *declaration/policy accuracy* issue, not an API defect: email is collected by design (login identifier, profile, recovery — §1). Fix = correct Play Data safety answers + accurate policy text (Quiz-React spec §2). No endpoint, schema, or auth change is needed or proposed for email.

One mobile-side observation, not an email-issue change: mobile `requestPasswordReset` posts to legacy `/auth/forgot-password` (no `/api/v1` prefix, `auth.api.ts:145`) while the live router is `/api/v1/auth/forgot-password`. **Founder to verify** whether any shipped mobile build exposes a forgot-password UI using that helper; if so it's a pre-existing bug to fix in mobile separately — do not bundle it into the Play declaration.

## 3. Can an existing deletion-request process be reused?

Partially. Existing today:
- **Email process** (published in Privacy Policy §6.3): `contactus@eduvijna.com` — real, human-handled, no tracking/verification system evidenced in code. Mobile now links this truthfully.
- **Admin delete** (`DELETE /usermanagement/users/{id}`, admin-only) — a *fulfilment* tool an operator could use after verifying an email request, but it is not a request channel and its data-cascade behaviour (below) is unverified.

So: **no API change is strictly required to resubmit** with the email process + founder's public deletion page (Quiz-React spec §3, mailto variant). The contract in §4 is required only if the founder wants in-product request submission/tracking instead of email.

## 4. NEW (proposed, not implemented) — deletion-request contract, only if replacing email

Label: **NEW**. Nothing here exists today.

```
POST /api/v1/account/deletion-requests        (Bearer, own account only)
  body: { "confirm_email": string, "reason"?: string }
  201: { "request_id": string, "status": "pending_verification", "submitted_at": iso }
  409 if an open request already exists (return existing request_id)
GET  /api/v1/account/deletion-requests/me     (Bearer) -> own request status or 404
POST /api/v1/admin/deletion-requests/{id}/verify   (admin)  -> status verified
POST /api/v1/admin/deletion-requests/{id}/fulfil   (admin)  -> runs §5 cascade, status completed
POST /api/v1/admin/deletion-requests/{id}/reject   (admin, reason required)
```

Rules: identity verification before fulfilment (request from authenticated session + email confirmation, or admin verification of the email route); every transition audit-logged (actor, timestamp); fulfilment is irreversible and must not be triggerable by the request call itself; status visible to the user until account closure. Rate-limit POST. Never return other users' requests (own/admin scope only).

## 5. Data relationships affected by fulfilment (verify each before deleting anyone)

From code read this pass — **founder must verify cascades in DB/PostgREST before first real deletion; do not assume FK cascades:**

- User/profile row + auth credentials, refresh/session tokens (revoke all sessions at fulfilment).
- ERP records: school membership, `class_students` enrolments, teacher class assignments, staff/student attendance (ERP modules) — school-retained records may need anonymisation rather than deletion (**founder/legal decision; do not invent retention periods**).
- Content: uploaded files/documents & OCR artefacts (disk + DB — cf. study-material soft-delete with disk cleanup, `study_materials_endpoints.py:1130`), generated quizzes/questions, saved books.
- Assessment: quiz sessions, attempts, answers, scores/analytics rows (`user_assessment_endpoints.py`).
- Notifications: device push tokens (`DELETE /devices/{token_id}` machinery exists) + notification history.
- Files storage: uploaded images/documents on disk/object storage; backups — deletion-from-backup timing is whatever infra actually does; **align policy §5.3's 90/180-day claims with reality or amend the policy. No retention period is proposed here.**
- AI/OCR processors: data already sent (Gemini/AnythingLLM confirmed configured via `/health`; Mathpix/OpenAI per policy only) cannot be recalled by account deletion — policy wording must say so accurately.

## 6. Acceptance tests & deployment dependencies

If §4 is built: (1) non-owner token cannot create/read another's request (403/404); (2) duplicate POST → 409 with same `request_id`; (3) fulfil without verification → rejected; (4) fulfil revokes sessions + removes push tokens (test push after deletion fails); (5) disposable test account end-to-end: request → verify → fulfil → login fails, profile 404, uploads/attempts handled per §5 decisions; (6) audit log contains every transition; (7) admin-delete endpoint unchanged for school admin workflows.
Dependencies: founder's Quiz-React `/delete-account` page (consumes §4 or mailto interim), mobile already links email process and needs **no change** to adopt §4 later beyond swapping the mailto helper for the API call; Play resubmission must not reference §4 until it is deployed to production and verified with a disposable account. **Never test deletion on real users or school data.**
