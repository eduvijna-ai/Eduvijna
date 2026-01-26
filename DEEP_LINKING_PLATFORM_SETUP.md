# Platform-Specific Deep Linking Setup

## iOS Universal Links Setup

### 1. Create Apple App Site Association File

Create a file named `apple-app-site-association` (no extension):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.eduvijna.app",
        "paths": [
          "/assessment/*"
        ]
      }
    ]
  }
}
```

**Replace `TEAM_ID`** with your Apple Developer Team ID.

### 2. Host the File

Upload to your web server:
```
https://eduvijna.com/.well-known/apple-app-site-association
https://app.eduvijna.com/.well-known/apple-app-site-association
```

**Requirements:**
- HTTPS only (not HTTP)
- No file extension
- Content-Type: `application/json`
- Must be accessible without authentication
- Max file size: 128 KB

### 3. Verify File is Accessible

```bash
curl -v https://eduvijna.com/.well-known/apple-app-site-association
```

Should return:
- HTTP 200 status
- Valid JSON content
- No redirects

### 4. Configure Xcode Project

**Option A: Using Expo (Recommended)**

Update `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.eduvijna.app",
      "associatedDomains": [
        "applinks:eduvijna.com",
        "applinks:app.eduvijna.com"
      ]
    }
  }
}
```

**Option B: Manual Xcode Configuration**

1. Open project in Xcode
2. Select your app target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "Associated Domains"
6. Add domains:
   - `applinks:eduvijna.com`
   - `applinks:app.eduvijna.com`

### 5. Test Universal Links

**On Device:**
1. Type link in Notes app
2. Long press the link
3. Should show "Open in EduVijna"

**Via Safari:**
```
https://eduvijna.com/assessment/test123
```

Should automatically open the app.

**Via Simulator:**
```bash
xcrun simctl openurl booted "https://eduvijna.com/assessment/test123"
```

### 6. Troubleshooting iOS

**Link not opening app:**
- Clear Safari website data
- Restart device
- Check associated domains in settings
- Verify JSON file is valid
- Check Xcode console for errors

**Validation Tool:**
```bash
# Install Apple's validation tool
curl -O https://search.developer.apple.com/applebot/resources/validation-tools/

# Or use online validator
# https://branch.io/resources/aasa-validator/
```

---

## Android App Links Setup

### 1. Generate SHA-256 Certificate Fingerprint

**Debug Certificate:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Release Certificate:**
```bash
keytool -list -v -keystore /path/to/release-keystore.jks -alias your-alias
```

Copy the SHA-256 fingerprint (looks like: `AA:BB:CC:DD:...`)

### 2. Create Asset Links File

Create `assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.eduvijna.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
      ]
    }
  }
]
```

**Replace:**
- `package_name`: Your app's package name
- `sha256_cert_fingerprints`: Your certificate fingerprint (remove colons)

**For multiple certificates (debug + release):**
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.eduvijna.app",
      "sha256_cert_fingerprints": [
        "DEBUG_CERT_FINGERPRINT",
        "RELEASE_CERT_FINGERPRINT"
      ]
    }
  }
]
```

### 3. Host the File

Upload to:
```
https://eduvijna.com/.well-known/assetlinks.json
https://app.eduvijna.com/.well-known/assetlinks.json
```

**Requirements:**
- HTTPS only
- Content-Type: `application/json`
- Publicly accessible
- No authentication required

### 4. Verify File is Accessible

```bash
curl -v https://eduvijna.com/.well-known/assetlinks.json
```

### 5. Verify App Configuration

The `app.json` is already configured with:

```json
{
  "android": {
    "package": "com.eduvijna.app",
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "*.eduvijna.com",
            "pathPrefix": "/assessment"
          }
        ],
        "category": ["BROWSABLE", "DEFAULT"]
      }
    ]
  }
}
```

### 6. Test App Links

**Via ADB:**
```bash
# Test deep link
adb shell am start -a android.intent.action.VIEW \
  -d "https://eduvijna.com/assessment/test123" \
  com.eduvijna.app

# Verify app link verification status
adb shell dumpsys package domain-preferred-apps
```

**Expected output:**
```
com.eduvijna.app:
  Domain verification state:
    eduvijna.com: verified
```

**Via Browser:**
1. Open Chrome on Android device
2. Navigate to `https://eduvijna.com/assessment/test123`
3. Should automatically open the app

### 7. Troubleshooting Android

**App link not verified:**
```bash
# Clear verification state
adb shell pm clear com.eduvijna.app

# Force verification
adb shell pm verify-app-links --re-verify com.eduvijna.app

# Check logs
adb logcat | grep -i "IntentFilter"
```

**Manual verification reset:**
- Settings → Apps → EduVijna → Open by default → Clear defaults

**Common issues:**
- Certificate fingerprint mismatch
- JSON file not accessible
- Package name mismatch
- `autoVerify: true` missing

---

## Web Configuration

### 1. Server Configuration

Ensure your web server serves the verification files correctly.

**Nginx:**
```nginx
location /.well-known/ {
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
    add_header Cache-Control "public, max-age=3600";
}

location /assessment/ {
    try_files $uri $uri/ /index.html;
}
```

**Apache:**
```apache
<Location "/.well-known/">
    Header set Content-Type "application/json"
    Header set Access-Control-Allow-Origin "*"
    Header set Cache-Control "public, max-age=3600"
</Location>

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^assessment/([^/]+)$ /index.html [L]
</IfModule>
```

**Vercel/Netlify:**
Create `vercel.json` or `netlify.toml`:

```json
{
  "routes": [
    {
      "src": "/.well-known/(.*)",
      "headers": { "Content-Type": "application/json" }
    },
    {
      "src": "/assessment/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 2. Test Web Routes

```bash
# Test verification files
curl https://eduvijna.com/.well-known/apple-app-site-association
curl https://eduvijna.com/.well-known/assetlinks.json

# Test assessment route
curl https://eduvijna.com/assessment/test123
```

All should return 200 OK.

---

## Complete Deployment Checklist

### Pre-Deployment

- [ ] Get Apple Team ID
- [ ] Get Android certificate fingerprints (debug + release)
- [ ] Create `apple-app-site-association` file
- [ ] Create `assetlinks.json` file
- [ ] Update files with correct IDs and fingerprints

### Hosting

- [ ] Upload files to `/.well-known/` directory
- [ ] Verify files accessible via HTTPS
- [ ] Configure web server headers
- [ ] Test with curl commands
- [ ] Enable CORS if needed

### iOS

- [ ] Add Associated Domains capability
- [ ] Add domain entries to Xcode/app.json
- [ ] Test on real device
- [ ] Verify link opens app from Safari
- [ ] Test from Notes app

### Android

- [ ] Verify `intentFilters` in app.json
- [ ] Build APK/AAB with correct certificate
- [ ] Install on device
- [ ] Test with adb commands
- [ ] Verify domain verification status
- [ ] Test from Chrome browser

### Web

- [ ] Configure server routing
- [ ] Test `/assessment/:id` routes
- [ ] Verify deep link redirect logic
- [ ] Test on different browsers
- [ ] Check console for errors

### Testing

- [ ] Test app-to-app navigation
- [ ] Test web-to-app handoff
- [ ] Test notification deep links
- [ ] Test role-based routing
- [ ] Test error scenarios (invalid links)
- [ ] Test on multiple devices

### Monitoring

- [ ] Set up analytics for deep links
- [ ] Monitor error logs
- [ ] Track conversion rates
- [ ] A/B test different formats

---

## Quick Verification Commands

### iOS
```bash
# Test universal link in simulator
xcrun simctl openurl booted "https://eduvijna.com/assessment/test"

# Verify AASA file
curl https://eduvijna.com/.well-known/apple-app-site-association | python -m json.tool
```

### Android
```bash
# Test app link
adb shell am start -a android.intent.action.VIEW \
  -d "https://eduvijna.com/assessment/test" com.eduvijna.app

# Verify domain verification
adb shell dumpsys package domain-preferred-apps | grep eduvijna

# Check certificate fingerprint
keytool -list -v -keystore ~/.android/debug.keystore
```

### Web
```bash
# Test all endpoints
curl -I https://eduvijna.com/.well-known/apple-app-site-association
curl -I https://eduvijna.com/.well-known/assetlinks.json
curl -I https://eduvijna.com/assessment/test123
```

---

## Production Release Checklist

### Before App Store Submission

**iOS:**
- [ ] Associated Domains configured
- [ ] AASA file hosted and verified
- [ ] Tested on real devices
- [ ] Universal links work in Safari
- [ ] No console errors in Xcode

**Android:**
- [ ] Release certificate fingerprint in assetlinks.json
- [ ] Domain verification passes
- [ ] Tested with production APK
- [ ] Works in Chrome and other browsers

**Both:**
- [ ] Deep links work from notifications
- [ ] Web handoff tested
- [ ] All user roles tested
- [ ] Error handling verified
- [ ] Documentation updated

### After Deployment

- [ ] Monitor analytics for deep link usage
- [ ] Check error logs
- [ ] Gather user feedback
- [ ] Update marketing materials
- [ ] Train support team

---

## Troubleshooting Quick Reference

### iOS Issues

| Problem | Solution |
|---------|----------|
| Link opens in Safari | Clear Safari data, restart device |
| "Open in app" not showing | Verify AASA file, check domains |
| Always asks which app | Remove app, reinstall |
| Works in Notes, not Safari | Safari caches, try private mode |

### Android Issues

| Problem | Solution |
|---------|----------|
| Asks which app to open | Domain not verified, check fingerprint |
| Opens browser not app | Run verification commands |
| Works on some devices only | Multiple certificate issue |
| Instant app banner shows | Intended behavior, or disable |

### Web Issues

| Problem | Solution |
|---------|----------|
| 404 on assessment route | Configure server routing |
| CORS errors | Add headers to .well-known |
| Files not accessible | Check HTTPS, permissions |
| Deep link redirect fails | Check browser console |

---

## Additional Resources

### Official Documentation
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [Android App Links](https://developer.android.com/training/app-links)
- [Expo Linking](https://docs.expo.dev/guides/linking/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking)

### Validation Tools
- [Branch.io AASA Validator](https://branch.io/resources/aasa-validator/)
- [Android Asset Links Tester](https://developers.google.com/digital-asset-links/tools/generator)
- [SSL Labs](https://www.ssllabs.com/ssltest/) - Verify HTTPS configuration

### Support Contacts
- For iOS issues: Check Apple Developer Forums
- For Android issues: Check Android Developer documentation  
- For Expo issues: Check Expo Forums
- For app-specific issues: Contact development team
