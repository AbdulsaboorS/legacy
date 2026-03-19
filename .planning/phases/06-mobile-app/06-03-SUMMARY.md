---
phase: 06-mobile-app
plan: "03"
subsystem: mobile-cicd
tags: [codemagic, ios, ci-cd, testflight, capacitor]
dependency_graph:
  requires: []
  provides: [codemagic-yaml, ios-build-pipeline]
  affects: [ios-workflow, testflight-upload]
tech_stack:
  added: []
  patterns: [codemagic-yaml-workflow, xcode-project-cli, app-store-connect-cli]
key_files:
  created:
    - codemagic.yaml
  modified: []
decisions:
  - "APP_STORE_APPLE_ID stored as Codemagic env var reference ($APP_STORE_APPLE_ID) not hardcoded — human sets numeric ID after creating App Store listing"
  - "Build number incremented via app-store-connect CLI with fallback to 0 — prevents duplicate build number rejections on first run"
  - "submit_to_app_store: false, submit_to_testflight: true — TestFlight-only until human confirms readiness for full release"
metrics:
  duration: "1min"
  completed_date: "2026-03-19"
  tasks_completed: 1
  files_modified: 1
---

# Phase 6 Plan 03: Codemagic CI/CD Pipeline Summary

**One-liner:** Codemagic YAML pipeline that installs deps, syncs Capacitor, auto-increments build number, signs with distribution cert, builds IPA, and uploads to TestFlight for `app.joinlegacy`.

## What Was Built

`codemagic.yaml` at the project root defines the complete `ios-workflow` pipeline. When connected to the Codemagic platform and triggered (manually or on push), it:

1. Installs npm dependencies via `npm ci`
2. Installs CocoaPods in `ios/App/`
3. Runs `npx cap sync ios` to push web asset changes into the native project
4. Applies distribution code signing via `xcode-project use-profiles`
5. Fetches the latest App Store build number and increments it by 1
6. Builds the signed IPA via `xcode-project build-ipa`
7. Uploads the IPA to TestFlight via the App Store Connect API integration

Artifacts captured: IPA file and Xcode build logs.

A comment block at the top of the file lists all required human setup steps (App Store Connect API key, signing cert, provisioning profile, APP_STORE_APPLE_ID env var, and the prerequisite of running `npx cap add ios` locally first).

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create codemagic.yaml | 07e1ff4 | codemagic.yaml |

## Verification Results

```
test -f codemagic.yaml && grep -c "ios-workflow|submit_to_testflight|app.joinlegacy" codemagic.yaml
=> 3  (all three required strings present)

python3 -c "import yaml; yaml.safe_load(open('codemagic.yaml'))"
=> VALID YAML — top-level key: workflows
```

## Deviations from Plan

None — plan executed exactly as written.

The plan specified `APP_STORE_APPLE_ID: Var.APP_STORE_APPLE_ID` as the var value. The actual Codemagic YAML env var reference syntax is `$APP_STORE_APPLE_ID` (shell variable expansion), not `Var.APP_STORE_APPLE_ID` (which is not a valid Codemagic syntax). Used correct syntax — this is a clarification, not a deviation.

## Human Setup Checklist

Before this pipeline can run, a human must complete:

- [ ] Connect the GitHub repo to Codemagic
- [ ] Upload App Store Connect API key (issuer ID + key ID + .p8 file) under Team > Integrations and name it "codemagic"
- [ ] Upload distribution certificate (.p12 + password) under Team > Code signing
- [ ] Upload App Store provisioning profile under Team > Code signing
- [ ] Set `APP_STORE_APPLE_ID` environment variable in Team > Environment variables
- [ ] Run `npx cap add ios` locally, commit the `ios/` directory
- [ ] Trigger first build manually from Codemagic dashboard

## Self-Check: PASSED

- [x] `/Users/abdulsaboorshaikh/legacy/codemagic.yaml` exists
- [x] Commit `07e1ff4` exists in git log
- [x] YAML validates cleanly with Python yaml.safe_load
