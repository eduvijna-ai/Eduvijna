# PR #28 Final Integration Gates — 2026-11-09

MOBILE_PR28_SOURCE_SHA=0836ac5adefbcc65869ac57acd4cdf9b39deac8e
MAIN_PREMERGE_SHA=b42bcd1acdbb2202792335c695c6da9da9e180f6

## Physical acceptance
PHYSICAL_FCM_ACCEPTANCE_EVIDENCE=Founder-confirmed physical Android push delivery (task authorization 2026-11-09)
APK_SOURCE_SHA=0836ac5adefbcc65869ac57acd4cdf9b39deac8e
APK_PATH=D:\wt\eduvijna-push-standalone-qa-0836ac5\android\app\build\outputs\apk\release\app-release.apk
APK_SHA256=AB178EC2E314413436BDA39C3422C02A924B058146D3D1490BD47DF3732477F0
APK_PACKAGE=com.eduvijna.app.dev
FIREBASE_PROJECT=eduvijna-push
NOTE=Engineering stack logs prior to Founder confirmation still recorded PHYSICAL_FCM_DELIVERY_VERIFIED=false; Founder confirmation in final integration authorization supersedes for delivery-to-device. Detailed G1-G10 written matrix was not re-filed after Founder install.

## Code review
PR28_CODE_REVIEW_PASS=true
PRODUCTION_PACKAGE_UNCHANGED=true
PRODUCTION_API_UNCHANGED=true
PRODUCTION_FIREBASE_UNCHANGED=true
DEV_FIREBASE_FILE_EXCLUDED=true

## Automated gates (isolated workspace D:\wt\eduvijna-push-standalone-qa-0836ac5, independent node_modules)
config:verify EXIT=0
Focused FCM/nav Jest: 8 suites / 38 tests PASS
journey-logic: 28/28 PASS
Production bundle verify (android+ios export): EXIT=0
Production expo identity: package=com.eduvijna.app googleServicesFile=./google-services.json scheme=eduvijna name=EduVijna
tsc --noEmit: 302 baseline error lines; no PushNotificationService errors; pre-existing Profile/device.api debt only

## Full regression vs main baseline (PlayRelease @ b42bcd1)
Feature: Test Suites 6 failed, 145 passed; Tests 8 failed, 602 passed
Baseline: Test Suites 8 failed, 142 passed; Tests 10 failed, 584 passed
Shared unrelated failures: CreateHandwrittenQuizScreen, assignedQuizRecovery, assessmentWorkspace, QuizTeacherAnalytics, StudentDashboard, traceRedact
Baseline-only (fixed by PR): notifications.api.readState, notificationReadState
PR_INTRODUCED_REGRESSIONS=0

## Post-merge verification
PR28_MERGED=true
MAIN_POSTMERGE_SHA=475158fd4005019cc6b2e0f67e42b54c340c2bb4
MAIN_CONTAINS_ALL_APPROVED_CHANGES=true (0836ac5 is ancestor of origin/main)
FRESH_MAIN_CHECKOUT=D:\wt\eduvijna-main-postmerge-475158f
FRESH_npm_ci_EXIT=0
FRESH_config:verify_EXIT=0
FRESH_production_API_BASE_URL=https://eduapi.eduvijna.com
FOUNDER_LOCAL_MAIN_PRESERVED=0e81f9e3dfb8b88f4dab6c7b7158819c602b9a2c (not force-updated)
PLAYRELEASE_PRESERVED=b42bcd1acdbb2202792335c695c6da9da9e180f6
MANUAL_AAB_INSTRUCTIONS=D:\wt\eduvijna-mobile-push-p0\.stack-validation-logs\pr28-final-integration-20261109\MANUAL_AAB_BUILD_INSTRUCTIONS.md
