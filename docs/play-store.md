# Shipping to the Play Store

This app is a PWA wrapped as a [Trusted Web Activity](https://developer.chrome.com/docs/android/trusted-web-activity)
using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). The PWA on Vercel is the
single source of truth — the Android wrapper is a thin shell that opens the live URL.

## Prerequisites

- The PWA is deployed to a **public HTTPS domain** (Vercel production is fine).
- `https://<your-domain>/manifest.webmanifest` returns a valid manifest (Next emits this from
  `app/manifest.ts`).
- A Google Play Console account ($25 one-time).
- JDK 17+ and the Android SDK (Bubblewrap installs them on first run if missing).

## One-time setup

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<your-domain>/manifest.webmanifest
```

Answer the prompts:

- **Application package name:** something like `app.babyfood.twa` (must be globally unique).
- **App name / launcher name:** "Baby Food".
- **Theme color:** `#3f9d4a` (matches `app/manifest.ts`).
- **Signing key:** let Bubblewrap generate one. **Back up the keystore + password — losing it
  means you can never push another update under the same package name.**

Bubblewrap prints an `assetlinks.json` snippet. Copy it into
`public/.well-known/assetlinks.json` (replace the placeholder file) and redeploy. Verify it's
served at `https://<your-domain>/.well-known/assetlinks.json` before continuing.

## Build

```bash
bubblewrap build
```

Outputs:

- `app-release-bundle.aab` — upload this to Play Console.
- `app-release-signed.apk` — sideload to a phone for testing
  (`adb install app-release-signed.apk`).

## Play Console

1. Create a new app. Privacy policy URL: `https://<your-domain>/privacy`.
2. Complete the Data Safety form (collected data: email, food/feeding logs).
3. Upload the AAB to **Internal testing** first; add the two parent emails as testers.
4. Promote to Closed → Open → Production over time.

## Updates

- **PWA content changes** (UI, copy, features): just deploy to Vercel — the wrapper picks them
  up on next launch. No new AAB needed.
- **Wrapper changes** (icons, theme, target SDK, package metadata): edit `twa-manifest.json`,
  bump `appVersion` and `appVersionCode`, then `bubblewrap update && bubblewrap build`, and
  upload the new AAB.

## Known gotchas

- If the TWA shows a Chrome URL bar, the asset links file isn't reachable or its SHA-256
  fingerprint doesn't match the signing key. Validate with
  [https://developers.google.com/digital-asset-links/tools/generator](https://developers.google.com/digital-asset-links/tools/generator).
- TWAs cannot use Play Billing or some native APIs. If you need those later, migrate to
  [Capacitor](https://capacitorjs.com/) — the PWA stays the same, you just swap the shell.
