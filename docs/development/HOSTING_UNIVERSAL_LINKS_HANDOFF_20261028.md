# Hosting handoff — Universal Links / App Links (Gate 8)

**Track:** separate from PR #27 mobile code. Do **not** invent Team IDs or signing fingerprints.  
**App identity (from committed `app.json`):**

| Platform | Identifier |
|----------|------------|
| iOS bundle | `com.eduvijna.app` |
| Android package | `com.eduvijna.app` |
| Associated domain (code) | `applinks:app.eduvijna.com` (preserved in `app.json`) |

## Required public files

### 1. Apple App Site Association

- URL: `https://app.eduvijna.com/.well-known/apple-app-site-association`
- Must be served over HTTPS with `Content-Type: application/json` (no `.json` extension required)
- Template (placeholders only — **replace `APPLE_TEAM_ID` after Founder confirmation**):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "APPLE_TEAM_ID.com.eduvijna.app",
        "paths": ["/openquiz", "/openquiz/*"]
      }
    ]
  }
}
```

**Status 2026-10-28:** live fetch → **404 HTML** (“No Results Found”). Universal Links **BLOCKED** until published with real Apple Team ID.

### 2. Android Digital Asset Links

- URL: `https://app.eduvijna.com/.well-known/assetlinks.json`
- Template (placeholders only — **replace SHA-256 after Play App Signing / release keystore verification**):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.eduvijna.app",
      "sha256_cert_fingerprints": [
        "VERIFY_PLAY_APP_SIGNING_SHA256",
        "VERIFY_UPLOAD_OR_RELEASE_KEYSTORE_SHA256"
      ]
    }
  }
]
```

Repo file `assetlinks.json` currently contains `REPLACE_WITH_*` placeholders — **do not upload as-is**.

**Status 2026-10-28:** live fetch → **HTTP 500**. App Links **BLOCKED**.

## Ownership / permission

Publishing these files requires confirmed ownership of `app.eduvijna.com` hosting and Founder authorization. This handoff does **not** modify production hosting.

## Physical-device verification

Keep **PENDING** until Founder authorizes physical Android/iOS testing after hosting is live.
