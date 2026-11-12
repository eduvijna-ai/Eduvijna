# Google Sign-In — separate scope from iOS FCM

Firebase onboarding may suggest enabling Google Sign-In. That is **not** part of iOS FCM delivery.

## Current EduVijna auth

- Mobile/web login uses EduVijna backend JWT sessions.
- Push registration uses the authenticated API client (`POST /api/notifications/devices`).
- No Firebase Auth Google provider is required for FCM token registration or message receipt.

## If Google Sign-In is desired later

Open a separate feature proposal covering:

1. Backend identity federation / account linking contract
2. Apple URL scheme / `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`
3. Mobile UI and session migration away from (or alongside) JWT login
4. Security review of token storage and school/user authorization

Do **not** fold Google Sign-In into the iOS FCM PR.
