# Phase 6: Mobile App - Research

**Researched:** 2026-03-19
**Domain:** Capacitor 8, iOS WebView, Google OAuth deep links, Codemagic CI/CD, Apple App Store submission
**Confidence:** MEDIUM — core Capacitor/iOS patterns are HIGH confidence; `server.url` production viability is MEDIUM with a documented App Store rejection risk; Codemagic YAML structure is MEDIUM (verified against official docs).

---

## Summary

Phase 6 wraps the existing Next.js/Vercel web app in a Capacitor iOS shell for App Store distribution. The chosen strategy — Capacitor WebView pointing at the live Vercel URL via `server.url` — avoids a Next.js static export (which would break API routes, middleware, and server components) but carries a real Apple guideline 4.2 rejection risk. That risk is mitigated because Legacy already integrates push notifications via `@capacitor/push-notifications` and `firebase-admin`, giving reviewers evidence of native-layer value beyond a bare website wrapper.

The hardest single task is Google OAuth deep linking. The Supabase OAuth flow redirects the browser to Google and back, but the Capacitor WebView does not automatically route that redirect into the app. The solution is: declare a custom URL scheme (`app.joinlegacy`) in `Info.plist`, register it as an allowed redirect in the Supabase dashboard, pass `redirectTo: 'app.joinlegacy://auth-callback'` in the `signInWithOAuth` call, and handle the inbound URL in an `App.addListener('appUrlOpen', ...)` listener that extracts tokens and calls `supabase.auth.setSession()` + `supabase.auth.refreshSession()`.

iOS safe-area insets, keyboard handling, and status bar theming are straightforward but must be applied before submission — missing them produces visible notch/home-bar overflow that guarantees rejection.

**Primary recommendation:** Follow the `server.url` strategy as planned. Add native push notifications integration in a visible way (Phase 7 already plans this) to satisfy guideline 4.2. Test OAuth deep link end-to-end on a real device before doing anything else — it is the riskiest piece and the hardest to debug in CI.

---

## Critical Architecture Decision: server.url vs Static Export

This is the most important decision to understand before planning.

| Approach | How it works | Pros | Cons |
|----------|-------------|------|------|
| **`server.url` (chosen)** | Capacitor WebView loads `https://legacy-bice.vercel.app` at runtime | Keeps all Next.js API routes, middleware, server components, Supabase SSR auth intact. Zero code refactoring. | Officially "not intended for production." Apple guideline 4.2 rejection risk. White screen if Vercel is down or user is offline. |
| **Static export** | `next build` with `output: 'export'`, WebView loads local `out/` files | No external dependency, works offline, no rejection risk | Breaks ALL API routes (Gemini, Supabase server-side, auth callback). Breaks middleware (route protection). Breaks App Router dynamic params. Would require a complete architectural rewrite. |

**Verdict:** Static export is not viable for this app. `server.url` is the only realistic path. The rejection risk is real but manageable — multiple teams have shipped App Store apps this way, and Legacy's native push notification layer (Phase 7) provides the "native value" Apple's reviewers look for.

**Confidence:** MEDIUM — based on community reports (multiple shipped apps) and Apple's guideline text, not official Capacitor documentation endorsement.

---

## Standard Stack

### Core (already installed)

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `@capacitor/core` | ^8.2.0 | Core bridge between WebView and native iOS | Already installed |
| `@capacitor/cli` | ^8.2.0 | CLI for `cap add ios`, `cap sync`, `cap open ios` | Already installed (devDependency) |
| `@capacitor/app` | ^8.0.1 | `appUrlOpen` deep link events, app state events | Already installed |
| `@capacitor/push-notifications` | ^8.0.2 | FCM push (Phase 7) but also signals native value to App Store reviewers | Already installed |

### Needs to be added

| Package | Version | Purpose | Install |
|---------|---------|---------|---------|
| `@capacitor/status-bar` | ^8.x | Match status bar to app light/dark theme | `npm install @capacitor/status-bar` |
| `@capacitor/keyboard` | ^8.x | Prevent keyboard from pushing WebView content up | `npm install @capacitor/keyboard` |

### Supporting Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Codemagic | CI/CD: build iOS IPA, sign, upload to App Store Connect | Free tier: 500 Mac M1 minutes/month |
| Xcode (human runs) | Open iOS project, run on device, archive for submission | Human-only step |
| App Store Connect | TestFlight beta, final submission | Human-only step |

**Installation:**
```bash
npm install @capacitor/status-bar @capacitor/keyboard
```

---

## Architecture Patterns

### Recommended File Layout (additions to existing project)

```
legacy/
├── capacitor.config.ts          # WebView config pointing at Vercel URL
├── codemagic.yaml               # CI/CD pipeline for iOS build + submission
├── ios/                         # Generated by `npx cap add ios` (do not edit manually)
│   └── App/
│       ├── App/
│       │   ├── Info.plist       # URL scheme, safe-area, status bar config
│       │   └── AppDelegate.swift
│       └── App.xcworkspace
├── src/
│   ├── app/
│   │   ├── privacy/
│   │   │   └── page.tsx         # Required by App Store: privacy policy page
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts     # Existing — verify it handles deep link token exchange
│   └── lib/
│       └── supabase/
│           └── native.ts        # Already exists — Capacitor-ready client (localStorage)
└── public/
    └── .well-known/
        └── apple-app-site-association  # Required IF using Universal Links (not needed for custom scheme)
```

### Pattern 1: capacitor.config.ts — WebView pointing at Vercel

```typescript
// Source: https://capacitorjs.com/docs/config
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.joinlegacy',
  appName: 'Legacy',
  webDir: 'out',  // Fallback dir (must exist even if server.url is set)
  server: {
    url: 'https://legacy-bice.vercel.app',
    cleartext: false,
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',          // Auto-matches device light/dark mode
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'none',            // Prevents keyboard from pushing WebView content
      style: 'DEFAULT',
    },
  },
};

export default config;
```

**Note on `webDir`:** Even with `server.url` set, Capacitor requires `webDir` to point to a valid directory. Create an empty `out/` folder or run a minimal `next build` (without `output: 'export'`) so that `out/` contains a placeholder. The WebView will use `server.url` at runtime and ignore `webDir` content.

**Simpler approach:** Set `webDir: 'public'` — this directory already exists in the project and contains PWA assets.

### Pattern 2: Google OAuth Deep Links (custom URL scheme)

Two sub-patterns exist. The project should use **custom URL scheme** (not Universal Links) because Universal Links require an `apple-app-site-association` file hosted on the domain and add complexity. Custom schemes work well for OAuth callbacks.

**Step A — Info.plist entry** (added after `npx cap add ios`, edit `ios/App/App/Info.plist`):
```xml
<!-- Source: https://supabase.com/docs/guides/auth/native-mobile-deep-linking -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>app.joinlegacy</string>
    </array>
  </dict>
</array>
```

**Step B — Supabase dashboard:** Add `app.joinlegacy://auth-callback` to Allowed Redirect URLs in Authentication > URL Configuration.

**Step C — signInWithOAuth call** (in whatever component triggers Google sign-in):
```typescript
// Detect Capacitor native platform
import { Capacitor } from '@capacitor/core';

const redirectTo = Capacitor.isNativePlatform()
  ? 'app.joinlegacy://auth-callback'
  : `${window.location.origin}/auth/callback`;

await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo },
});
```

**Step D — appUrlOpen listener** (add to root layout or a dedicated component that mounts once):
```typescript
// Source: https://github.com/orgs/supabase/discussions/11548
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  App.addListener('appUrlOpen', async (event) => {
    const url = event.url;
    // Extract tokens from URL fragment (Supabase implicit flow)
    if (url.includes('access_token')) {
      const params = new URLSearchParams(url.split('#')[1]);
      const access_token = params.get('access_token') ?? '';
      const refresh_token = params.get('refresh_token') ?? '';
      if (access_token) {
        // setSession alone does not fire auth state change events
        await supabase.auth.setSession({ access_token, refresh_token });
        await supabase.auth.refreshSession({ refresh_token });
      }
    }
  });
}
```

**Critical:** Call `refreshSession()` after `setSession()`. `setSession()` alone does not trigger the internal auth state subscriber, so `onAuthStateChange` listeners won't fire and the UI won't update.

### Pattern 3: Safe Area CSS

Add to `src/app/globals.css` (or a dedicated `native.css`):
```css
/* Safe area insets for iOS notch / Dynamic Island / home bar */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

The HTML `<meta name="viewport">` must include `viewport-fit=cover` for `env(safe-area-inset-*)` to work. Check `src/app/layout.tsx` — add if missing:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### Pattern 4: Codemagic iOS Workflow

```yaml
# Source: https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/
workflows:
  ios-workflow:
    name: Legacy iOS
    max_build_duration: 120
    instance_type: mac_mini_m1
    integrations:
      app_store_connect: codemagic   # API key integration name in Codemagic Team settings
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: app.joinlegacy
      vars:
        APP_STORE_APPLE_ID: 1555555551   # Replace with actual App Store Connect app ID
        XCODE_WORKSPACE: "ios/App/App.xcworkspace"
        XCODE_SCHEME: "App"
      node: v20.14.0
      xcode: latest
    scripts:
      - name: Install dependencies
        script: npm ci
      - name: Install CocoaPods
        script: cd ios/App && pod install
      - name: Sync Capacitor
        script: npx cap sync ios
      - name: Set up code signing
        script: xcode-project use-profiles
      - name: Increment build number
        script: |
          LATEST_BUILD_NUMBER=$(app-store-connect get-latest-app-store-build-number "$APP_STORE_APPLE_ID")
          agvtool new-version -all $(($LATEST_BUILD_NUMBER + 1))
      - name: Build IPA
        script: xcode-project build-ipa --workspace "$XCODE_WORKSPACE" --scheme "$XCODE_SCHEME"
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
        submit_to_app_store: false   # Switch to true when ready for full release
```

**Required Codemagic secrets (set in Team > Environment variables):**
- App Store Connect API key (issuer ID, key ID, .p8 file) — upload via Codemagic UI
- Distribution certificate (.p12 + password) — upload via Codemagic UI
- App Store Connect provisioning profile — upload via Codemagic UI

### Anti-Patterns to Avoid

- **Setting `resize: 'body'` for keyboard:** This changes viewport dimensions and can cause layout shifts; use `resize: 'none'` instead to keep the WebView static.
- **Using `server.url` with `cleartext: true`:** Never in production. Vercel serves HTTPS. `cleartext` is only for local dev HTTP servers.
- **Calling `setSession()` without `refreshSession()`:** Auth state change listeners won't fire; the user appears logged out even after successful OAuth.
- **Skipping `viewport-fit=cover`:** Without this meta tag, `env(safe-area-inset-*)` returns 0 and safe areas have no effect.
- **Hardcoding redirectTo in OAuth without platform detection:** Web redirect must go to `/auth/callback`, native must use the custom scheme. Mixing them breaks both.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deep link URL parsing | Custom regex/string splitting | `URL` + `URLSearchParams` browser APIs | Handles encoding edge cases |
| iOS safe area detection | JavaScript screen measurement | `env(safe-area-inset-*)` CSS | Native browser API, correct on all notch/island devices |
| Certificate/signing management | Manual Xcode cert flow | Codemagic automatic code signing | Cert expiry, renewal, and profile management are error-prone manually |
| Build number increment | Manual edit of Info.plist | Codemagic `app-store-connect get-latest-app-store-build-number` | Prevents duplicate build number rejections |

---

## Common Pitfalls

### Pitfall 1: White Screen on Offline Launch
**What goes wrong:** User opens the app with no internet. `server.url` tries to load `legacy-bice.vercel.app` and gets nothing. The WebView shows a blank white screen.
**Why it happens:** Unlike a static-export Capacitor app, there are no local HTML files to fall back on.
**How to avoid:** The existing PWA service worker (`@ducanh2912/next-pwa`) caches the web app. When the native WebView loads the Vercel URL, the service worker intercepts and serves cached content. **Verify this works** by testing in airplane mode after first load.
**Warning signs:** Blank screen in TestFlight when device has no data connection.

### Pitfall 2: App Store Guideline 4.2 Rejection
**What goes wrong:** Apple reviewer sees a "lazy WebView wrapper" and rejects under 4.2 (minimum functionality).
**Why it happens:** Apps that load a URL and do nothing native are explicitly called out in Apple guidelines.
**How to avoid:** Legacy already has push notification infrastructure (`@capacitor/push-notifications`). Make sure it is wired up (even if Phase 7 — at minimum register the device token). The reviewer will see native push entitlements in the app binary. Also: document the app's unique functionality (AI habit plans, Islamic-themed content) clearly in the App Store description.
**Warning signs:** Review note saying "Your app appears to be a web app delivered in a native shell."

### Pitfall 3: OAuth Deep Link Not Firing
**What goes wrong:** User taps "Sign in with Google," browser opens, they authenticate, but the app never receives the callback.
**Why it happens:** The custom URL scheme must be registered in BOTH Info.plist AND the Supabase allowed redirects list. If either is missing, the OS won't route the URL back to the app.
**How to avoid:** Test on a real device (not simulator) using TestFlight. Register `app.joinlegacy://auth-callback` in Supabase dashboard before testing.
**Warning signs:** After Google auth, Safari opens `app.joinlegacy://...` but nothing happens — OS can't find the app to handle the scheme.

### Pitfall 4: `webDir` Directory Not Found
**What goes wrong:** `npx cap sync` fails with "webDir does not exist."
**Why it happens:** Capacitor CLI requires the `webDir` to exist on disk even when `server.url` overrides it at runtime.
**How to avoid:** Set `webDir: 'public'` (already exists) in `capacitor.config.ts`. The `public/` directory is a valid target.

### Pitfall 5: Capacitor.isNativePlatform() Always Returns False
**What goes wrong:** Deep link listener and native client code never run in the iOS app.
**Why it happens:** `Capacitor.getPlatform()` can return `"web"` when loading from a remote URL because the platform detection relies on native bridge initialization. This is a known issue with `server.url` apps.
**How to avoid:** Test `Capacitor.isNativePlatform()` explicitly on a real device build. If it returns false, check that Capacitor's native bridge is initialized before the first JavaScript execution. Alternatively, use `navigator.userAgent` iOS detection as a fallback.
**Warning signs:** Console log of `Capacitor.getPlatform()` prints `"web"` on a real iPhone.

### Pitfall 6: Keyboard Pushes Content on Refine/Onboarding
**What goes wrong:** When the keyboard appears on text input screens (habit refinement, onboarding step 2), the entire WebView scrolls up, content goes behind the keyboard.
**Why it happens:** Default Capacitor keyboard behavior on iOS resizes the web view.
**How to avoid:** Set `Keyboard.resize: 'none'` in `capacitor.config.ts`. This is the only iOS-correct setting for a full-screen web app.

---

## Code Examples

### Checking if running in Capacitor (platform guard)
```typescript
// Source: https://capacitorjs.com/docs/config
import { Capacitor } from '@capacitor/core';

// Use this guard around ALL native plugin calls
if (Capacitor.isNativePlatform()) {
  // Safe to call native plugins here
}
```

### Status Bar initialization (call once on app mount)
```typescript
// Source: https://capacitorjs.com/docs/apis/status-bar
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  await StatusBar.setStyle({ style: Style.Default }); // Auto light/dark
  await StatusBar.setOverlaysWebView({ overlay: false });
}
```

### Capacitor sync command (run after every `npm run build`)
```bash
# Run after any native config change
npx cap sync ios

# Open Xcode to run on device or archive
npx cap open ios
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@ionic-native` plugins | `@capacitor/*` first-party plugins | Capacitor 3+ | Direct imports, no Ionic dependency |
| Cordova | Capacitor | 2019+ | Better TypeScript, simpler bridge |
| Ionic Appflow | Codemagic | 2024 (Appflow pricing changes) | Free tier available, better YAML control |
| Manual cert management in Xcode | Codemagic automatic signing | Ongoing | Reduces human error in CI |

**Deprecated/outdated:**
- `@ionic-native/*` wrappers: Replaced by direct `@capacitor/*` plugin imports. Do not use.
- `cordova-plugin-*`: Not compatible with Capacitor. Do not use.
- Ionic Appflow: Paid only, no free tier. Codemagic is the standard alternative.

---

## Open Questions

1. **Does `Capacitor.isNativePlatform()` return `true` in a `server.url` app?**
   - What we know: Known issue where it returns `"web"` in some `server.url` configurations.
   - What's unclear: Whether Capacitor 8 fixed this.
   - Recommendation: Test immediately after first `cap add ios` + device build. If it fails, use `window.navigator.userAgent.includes('Capacitor')` as fallback.

2. **Does the existing service worker (next-pwa) work inside the Capacitor WebView?**
   - What we know: Service workers require HTTPS; Vercel serves HTTPS; should theoretically work.
   - What's unclear: Whether Capacitor's WebView registers service workers from `server.url` targets correctly.
   - Recommendation: Test offline mode in TestFlight as part of first device build verification.

3. **Do Supabase SSR cookies work inside the Capacitor WebView?**
   - What we know: `native.ts` uses `localStorage` for session persistence, which Capacitor's WebView preserves across app kills.
   - What's unclear: The existing web app pages use `@supabase/ssr` (cookie-based client). These two clients will coexist, and the native pages will use the SSR cookie client, not the localStorage client.
   - Recommendation: The planned approach (native.ts as a separate client) likely needs to be wired into the OAuth deep link handler specifically. The web pages running in the WebView will continue to use their existing SSR cookie auth normally. Verify that backgrounding and restoring the app preserves the session.

4. **Will Apple require a native tab bar for 4.2 compliance?**
   - What we know: Having native push notifications in the binary helps. Multiple teams have shipped similar apps.
   - What's unclear: Specific reviewer threshold — some reviewers are stricter than others.
   - Recommendation: Submit the initial build with push notification entitlements wired. If rejected under 4.2, the appeal path is to describe the AI features, streak tracking, and Islamic content as distinct native-value features.

---

## Sources

### Primary (HIGH confidence)
- [Capacitor Configuration Docs](https://capacitorjs.com/docs/config) — `server.url`, `webDir`, plugin config structure
- [Capacitor Status Bar API](https://capacitorjs.com/docs/apis/status-bar) — `setStyle`, `overlaysWebView`, Info.plist requirements
- [Capacitor Keyboard API](https://capacitorjs.com/docs/apis/keyboard) — `resize: 'none'` for iOS
- [Capacitor Deep Links Guide](https://capacitorjs.com/docs/guides/deep-links) — `appUrlOpen` event, Associated Domains
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) — Info.plist URL scheme format, Supabase dashboard configuration

### Secondary (MEDIUM confidence)
- [Codemagic Ionic Capacitor Docs](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/) — codemagic.yaml structure, signing variables, App Store Connect publishing
- [Capgo: Automatic Capacitor iOS Build with Codemagic](https://capgo.app/blog/automatic-capacitor-ios-build-codemagic/) — build scripts, CocoaPods, IPA creation steps
- [Supabase Discussion #11548](https://github.com/orgs/supabase/discussions/11548) — `setSession` + `refreshSession` pattern for Capacitor OAuth
- [Capacitor Discussion #4080: server.url in production](https://github.com/ionic-team/capacitor/discussions/4080) — real-world reports of App Store approval with `server.url`

### Tertiary (LOW confidence — flag for validation)
- [Capacitor Discussion #5075: Why server.url is not for production](https://github.com/ionic-team/capacitor/discussions/5075) — Anecdotal. Official docs say "not for production"; community says it works. Test empirically.
- [App Store WebView rejection risk analysis](https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper) — Third-party analysis of guideline 4.2, not Apple official.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Capacitor 8 packages are installed and verified against package.json
- `server.url` viability: MEDIUM — Officially unsupported but community-verified in production with App Store approval
- OAuth deep link pattern: MEDIUM — Multiple sources agree on the pattern; `setSession` + `refreshSession` requirement confirmed by Supabase discussion
- Codemagic YAML: MEDIUM — Verified against official Codemagic docs; exact values (workspace path, scheme name) depend on what `npx cap add ios` generates
- Apple 4.2 risk: LOW — Outcome depends on individual reviewer; no official guarantee either way

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — Capacitor and App Store policies are relatively stable)
