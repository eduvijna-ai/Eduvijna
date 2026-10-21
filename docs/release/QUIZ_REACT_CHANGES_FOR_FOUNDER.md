# Quiz-React Changes for the Founder (Play Data Safety)

Repo: `eduvijna-ai/Quiz-React` — **read-only for this remediation; implement separately.**
Baseline read: `main@8f65e7f` (incl. PR #335 `947e07f` "Email address (Optional)"). No files were changed there.
Mobile side already links `https://app.eduvijna.com/privacy` (live, HTTP 200, verified 2026-10-21).

## 1. Exact existing files/routes

| File | Route / role |
|---|---|
| `src/App.tsx:1030-1031` | Route `/privacy` → `<PrivacyPolicy />` |
| `src/components/PrivacyPolicy.tsx` | The published policy (670 lines) |
| `src/components/Footer.tsx:67-89` | Footer "Privacy Policy" → `/privacy` |
| `src/components/TermsAndConditions.tsx:445-460,587` | Terms §9 links `/privacy`, cites `eduvijna.com/privacy` |

## 2. Current `PrivacyPolicy.tsx` discrepancies (fix these; do not re-litigate settled text)

Already done (do not redo): §2.1 "Email address (Optional)" via PR #335.

Remaining, in priority order:

1. **Wrong canonical domain (live 404).** Policy §1 (line 168) and Terms (line 460) present `eduvijna.com/privacy`; `https://eduvijna.com/privacy` returns **404** (verified 2026-10-21). The working URL is `https://app.eduvijna.com/privacy`. Replace user-visible `eduvijna.com` policy/terms references with `app.eduvijna.com` (or make the apex redirect — your choice, one canonical URL everywhere, matching Play Console).
2. **§6.3 deletion instructions describe a flow that does not exist in-app.** "Full Account Deletion: Account Settings → Delete Account" — mobile previously showed "not yet available", web has no such working self-service flow found this pass. Until §3 ships, change §6.3 to the truthful process: email `contactus@eduvijna.com`, subject "Account Deletion Request", identity verification, 30-day completion claim **only if operations actually meet it**.
3. **Unverified retention/security claims.** §5.3 (inactive 24 months; backups purged 90 days; archives 180 days), §5.2 (AES-256 at rest, MFA for admins, bcrypt) — keep only what you can evidence with the API/host; soften or remove the rest. These feed Play "encryption/retention" answers, so policy and Console must match reality (see API spec §5).
4. **§2.1 payment/billing + §4.1 processor lists.** Confirm each named processor (Stripe/Razorpay/PayU; OpenAI/Groq/Mathpix) actually receives user data in production; remove or scope ("when you use X") anything not live. Play answers are per-app — web billing text must not imply Android in-app payment if none exists.
5. **Staleness:** Effective/Last Updated still "November 29, 2025" (lines 159-160) despite the Oct 2026 email edit. Bump Last Updated whenever §2/§6 text changes.

## 3. Proposed public deletion-request page (NEW)

Play requires a publicly reachable account-deletion link for the Console "Account deletion" declaration. Email-only is the interim process (already linked from mobile); this page makes it durable and linkable.

**Route:** `/delete-account` in `src/App.tsx`, component `src/components/DeleteAccount.tsx` (new).

Behaviour (truthful, no fake success):
- Logged-out accessible. Explains: what is deleted, what may be retained (school/institution records, legal holds — *founder/legal to word*), identity-verification step, and timeline **as actually operated**.
- Primary action: if the API deletion-request endpoint (API spec §4, NEW) exists, an authenticated form posting to it with success = "request received, reference ID …" only on HTTP success. Until that endpoint ships, the page's only action is `mailto:contactus@eduvijna.com?subject=Account%20Deletion%20Request` plus instructions — labelled "Email us to request deletion", never "Delete my account".
- No admin user-delete call, no logout-as-deletion.

Snippet (route + link wiring; adapt styling to Footer conventions):

```tsx
// src/App.tsx — beside the existing /privacy route (line ~1030)
<Route path="/delete-account" element={<DeleteAccount />} />
```

```tsx
// src/components/Footer.tsx — next to Privacy Policy (line ~67)
<button onClick={() => handleNavigation('/delete-account')}>Delete Account</button>
```

Also add a "Delete Account / Request deletion" item wherever web Account Settings lives, linking `/delete-account` (not a direct delete call).

## 4. Required published URLs & verification

| URL | Must be |
|---|---|
| `https://app.eduvijna.com/privacy` | Public 200, canonical everywhere (fix §2.1 domain refs) |
| `https://app.eduvijna.com/delete-account` | Public 200 logged-out (NEW, §3) |

Verify after deploy: (1) both URLs load logged-out on a phone browser; (2) Footer + Terms links land on 200 pages; (3) Play Console Privacy Policy + Account deletion fields use exactly these URLs; (4) policy text, page text, and Console answers agree on email collection, deletion timeline, retention.

**Do not ship a placeholder page** ("coming soon") — Play reviewers follow the link.
