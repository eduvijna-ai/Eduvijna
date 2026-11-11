# iOS GoogleService-Info.plist — EAS file injection

The real `GoogleService-Info.plist` is **gitignored**. Local engineering uses a Founder-provisioned file at:

`./GoogleService-Info.plist`

Cloud iOS builds must receive the same approved client file through EAS environment **file** variables.

## Required EAS environment variable

| Name | Type | Scope | Profiles |
|------|------|-------|----------|
| `EDUVIJNA_IOS_GOOGLE_SERVICES_FILE` | **file** | project (or environment) | `ios-fcm-preview`, `ios-fcm-testflight`, any iOS production build |

`app.config.ts` already resolves:

```text
process.env.EDUVIJNA_IOS_GOOGLE_SERVICES_FILE || './GoogleService-Info.plist'
```

When the EAS file env is present, Expo/EAS places the file on the builder and sets the env var to that path.

## Founder action (authorized account)

From a machine that has the approved plist locally (do not paste contents into chat):

```bash
cd D:\wt\eduvijna-mobile-ios-fcm
eas env:create --name EDUVIJNA_IOS_GOOGLE_SERVICES_FILE --type file --value ./GoogleService-Info.plist --environment production --visibility secret
```

Repeat for `preview` if internal iOS preview builds will also run before production.

Confirm with:

```bash
eas env:list --environment production
```

Do **not** upload APNs `.p8` keys as EAS secrets for this workflow — those already live in Firebase Console.

## Local developer setup

1. Copy the Founder-downloaded plist to `./GoogleService-Info.plist` (gitignored).
2. Optional backup already supported under `.local/` (gitignored).
3. Use `GoogleService-Info.example.plist` only as a sanitized metadata template.
