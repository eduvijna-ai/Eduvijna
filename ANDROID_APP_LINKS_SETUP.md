# Android App Links Setup Guide

## What are App Links?
App Links allow your Android app to open automatically when users click on `https://ui.eduvijna.com` URLs (no browser prompt).

## Setup Steps

### 1. Generate Digital Asset Links File

The app needs to verify ownership of the domain. Place this file on your web server:

**File Location:** `https://ui.eduvijna.com/.well-known/assetlinks.json`

**File Content:**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.eduvijna.app",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### 2. Get SHA256 Fingerprint

**For Debug Build:**
```bash
cd android
./gradlew signingReport
```

Look for the SHA256 fingerprint under `Variant: debug` → `Config: debug`

**For Release Build:**
```bash
keytool -list -v -keystore your-release-key.keystore
```

Or if using Google Play signing:
1. Go to Google Play Console
2. Release → Setup → App signing
3. Copy the SHA-256 certificate fingerprint

### 3. Update assetlinks.json

Replace `YOUR_SHA256_FINGERPRINT_HERE` with your actual SHA256 fingerprint (without colons).

**Example:**
```json
"sha256_cert_fingerprints": [
  "14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5"
]
```

Becomes (remove colons):
```json
"sha256_cert_fingerprints": [
  "146DE983C5730650D8EEB9952F34FC6416A08342E61DBEA88A0496B23FCF44E5"
]
```

### 4. Upload to Web Server

Upload `assetlinks.json` to:
```
https://ui.eduvijna.com/.well-known/assetlinks.json
```

**Verify it's accessible:**
```bash
curl https://ui.eduvijna.com/.well-known/assetlinks.json
```

### 5. Test App Links

**Method 1: Using ADB**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "https://ui.eduvijna.com/openquiz?session_id=TEST123" com.eduvijna.app
```

**Method 2: Send Test Link**
Send the link via WhatsApp/Telegram to yourself and tap it.

**Method 3: Google Tool**
Use the [Statement List Generator and Tester](https://developers.google.com/digital-asset-links/tools/generator)

### 6. Verify Configuration

The `app.json` already has the correct configuration:

```json
"android": {
  "intentFilters": [
    {
      "action": "VIEW",
      "autoVerify": true,
      "data": [
        {
          "scheme": "https",
          "host": "ui.eduvijna.com",
          "pathPrefix": "/openquiz"
        }
      ],
      "category": ["BROWSABLE", "DEFAULT"]
    }
  ]
}
```

## Current Status

✅ **app.json** configured with `autoVerify: true`  
✅ **Deep link handler** supports both `eduvijna://` and `https://ui.eduvijna.com`  
✅ **Session ID parsing** from `?session_id=xxx` parameter  
⚠️ **Need to deploy** `assetlinks.json` to web server  
⚠️ **Need SHA256 fingerprint** from your release keystore

## How It Works

### Without App Links (Current):
1. User clicks `https://ui.eduvijna.com/openquiz?session_id=xxx`
2. Browser opens showing a prompt: "Open with EduVijna app?"
3. User must tap "Open" to launch app

### With App Links (After Setup):
1. User clicks `https://ui.eduvijna.com/openquiz?session_id=xxx`
2. App opens **immediately** (no prompt)
3. Quiz validation starts automatically

## Testing Checklist

- [ ] Get SHA256 fingerprint for debug build
- [ ] Get SHA256 fingerprint for release build (Play Store)
- [ ] Create assetlinks.json with both fingerprints
- [ ] Upload to `https://ui.eduvijna.com/.well-known/assetlinks.json`
- [ ] Verify file is accessible via browser
- [ ] Test with WhatsApp shared link
- [ ] Test with ADB command
- [ ] Rebuild and reinstall app

## Troubleshooting

**App Links not working?**
1. Clear app data and reinstall
2. Verify assetlinks.json is accessible
3. Check SHA256 fingerprint matches
4. Wait up to 24 hours for Google verification
5. Check logcat for verification errors:
   ```bash
   adb logcat | grep -i "IntentFilter"
   ```

**Still opening in browser?**
- The `autoVerify` flag tells Android to verify domain ownership
- If verification fails, it falls back to browser
- Check Google Search Console for verification status
