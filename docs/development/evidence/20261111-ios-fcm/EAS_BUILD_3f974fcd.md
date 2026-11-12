# EAS iOS FCM TestFlight build — 3f974fcd

Date: 2026-11-11

## Authority
- MAIN_BASE_SHA: `475158fd4005019cc6b2e0f67e42b54c340c2bb4`
- IOS_PR29_SOURCE_SHA: `1df911b34e32f9586ebc0f818fe4ef95a9e969ed`
- Profile: `ios-fcm-testflight`
- Founder EAS build authorized: true (single attempt)

## Build
- EAS_BUILD_ID: `3f974fcd-2787-4fc6-b108-b51755e87521`
- URL: https://expo.dev/accounts/samathakotikanyadanam/projects/eduvijna/builds/3f974fcd-2787-4fc6-b108-b51755e87521
- Status: **ERRORED**
- Allocated buildNumber: **1.0.9** (remote autoIncrement from 1.0.8)
- Reported appVersion on build metadata: `1.0.0` (investigate before retry; local `expo.ios.version` is `1.0.3`)
- IPA: not generated

## Environment observed
- VM: `macos-sequoia-15.6-xcode-26.0` / Xcode 26.0
- Apple Team: `847JWGJ2VM`
- Bundle: `com.eduvijna.app`
- CocoaPods: success (RNFBApp/Messaging 27.1.1 + Firebase SPM products)
- Signing: existing App Store cert + profile accepted (non-interactive)

## Root cause
SwiftPM resolve of `firebase-ios-sdk` (RNFB `sdkVersions.ios.firebase` = `13.1.1`) failed:

```text
Firebase requires Swift 6.2.3 or higher. Please upgrade to Xcode 26.2 or later.
```

Default EAS image Xcode 26.0 is insufficient for Firebase Apple SDK 12.12+/13.x Package.swift gate.

## Fix prepared (no second cloud build started)
- Pin iOS FCM profiles to `"image": "macos-sequoia-15.6-xcode-26.2"`
- Android / generic `production` image left unchanged
- Retry requires separate Founder authorization (authorized build already consumed)

## Not done
- TestFlight submit
- Main merge
- Second EAS build
