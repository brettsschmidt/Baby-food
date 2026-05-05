# Deploy checklist — Vercel + Bubblewrap + Play Console

The remaining steps are things only a human can do (sign in to dashboards, pay $25, run native tooling). Work through this in order. Estimate: ~3 hours of active work, plus 1–7 days of Google review.

---

## Phase 1 — Production deploy (Vercel)

### 1.1 Push the branch
```bash
git status                  # confirm everything's committed
git push origin main
```

### 1.2 Wire Vercel to the repo
1. https://vercel.com/new → Import Git Repository → pick `Baby-food`.
2. Framework: **Next.js** (auto-detected).
3. Root directory: leave blank (project root).
4. Build command: leave default (`next build`).
5. Click Deploy. First build will fail on missing env vars — that's expected; we add them next.

### 1.3 Set environment variables (Production scope)

Project Settings → Environment Variables. Add **every** key below, scoped to **Production** (not Preview):

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yjwoqpukvjeacavsyves.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (same as `.env.local`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Get from** Supabase → Project Settings → API → "service_role" → reveal & copy |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-vercel-domain>` (or custom domain once attached) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | (same as `.env.local`) |
| `VAPID_PRIVATE_KEY` | (same as `.env.local`) |
| `VAPID_SUBJECT` | `mailto:brettsschmidt@gmail.com` |
| `CRON_SECRET` | (same as `.env.local`) |
| `ADMIN_EMAILS` | `brettsschmidt@gmail.com` |
| `TOTP_ENCRYPTION_KEY` | (same as `.env.local`) |
| `SHARE_LINK_SECRET` | (same as `.env.local`) |

> Re-using local secrets is fine for v1. If anything ever leaks from `.env.local`, rotate VAPID + TOTP_ENCRYPTION_KEY + SHARE_LINK_SECRET in both places. Existing TOTP enrolments would need to be re-done after a TOTP key rotation, so prefer not to rotate that one casually.

### 1.4 Trigger a redeploy
Deployments → latest → ⋯ → **Redeploy** (with cache cleared). Wait for green ✓.

### 1.5 Tell Supabase about the new domain
1. https://supabase.com/dashboard/project/yjwoqpukvjeacavsyves/auth/url-configuration
2. **Site URL** → `https://<your-vercel-domain>`
3. **Redirect URLs** → add `https://<your-vercel-domain>/auth/callback`
4. Optional, for preview deploys: add `https://*-yourteam.vercel.app/auth/callback` (your team slug)
5. Save.

### 1.6 Smoke test prod
- `https://<prod>/` — landing page renders.
- `https://<prod>/manifest.webmanifest` — returns valid JSON.
- `https://<prod>/privacy` — privacy policy renders.
- `https://<prod>/.well-known/assetlinks.json` — returns the placeholder file (real fingerprint added in Phase 2).
- Sign up with a fresh email; complete onboarding; log a feeding. Confirm cubes decrement.

---

## Phase 2 — Bubblewrap (Android wrapper)

### 2.1 Install prerequisites (one-time)
```bash
brew install openjdk@17           # or download Adoptium JDK 17
npm install -g @bubblewrap/cli
```

Ensure `JAVA_HOME` points to JDK 17:
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc
java -version                     # should print 17.x
```

### 2.2 Initialize the TWA
```bash
cd ~/Desktop                     # or wherever you want the Android project
mkdir baby-food-twa && cd baby-food-twa
bubblewrap init --manifest https://<your-prod-domain>/manifest.webmanifest
```

Answer the prompts:
- Domain: `<your-prod-domain>` (auto-filled)
- Application package: `app.babyfood.twa` (or your choice — **immutable** once published)
- Application name: `Baby Food`
- Display name (launcher): `Baby Food`
- Theme color: `#3f9d4a`
- Background color: `#ffffff`
- Icon URL: leave default (uses `/icons/icon-512.png`)
- Maskable icon URL: leave default
- Splash screen color: `#ffffff`
- Generate signing key: **Yes** (let Bubblewrap create one)
- Keystore password: **set a strong one and write it down**
- Key alias: `android` (default)
- Key password: same as keystore (default — easier to remember)

> 🚨 **Back up `android.keystore` + the password right now.** Lose it and you can never publish another update under this package name. Drop it in 1Password / Bitwarden / a backed-up folder. Do **not** commit it to git.

### 2.3 Replace the asset-links file

Bubblewrap prints output that ends with:
```
Use the following to verify the assetlinks.json file:
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.babyfood.twa",
      "sha256_cert_fingerprints": ["XX:XX:XX:..."]
    }
  }
]
```

Copy that JSON into `public/.well-known/assetlinks.json` in your Next repo (replacing the placeholder), commit, and push to trigger a redeploy:

```bash
# in the Baby-food repo
# (paste the snippet above into public/.well-known/assetlinks.json)
git add public/.well-known/assetlinks.json
git commit -m "chore(android): real assetlinks fingerprint"
git push
```

Verify the file is live:
```bash
curl https://<your-prod-domain>/.well-known/assetlinks.json
```
The fingerprint should match what Bubblewrap printed.

### 2.4 Build the AAB
```bash
# back in baby-food-twa/
bubblewrap build
```
Outputs:
- `app-release-bundle.aab` — upload this to Play Console
- `app-release-signed.apk` — sideload to a phone for testing

### 2.5 Sideload-test
```bash
# put your phone in dev mode + USB debug, plug in
adb install app-release-signed.apk
```
Open the app on your phone. **Critical check: no Chrome address bar at the top.** If you see one, the asset links don't match — re-verify step 2.3.

If the splash → app flow works clean, you're ready to upload.

---

## Phase 3 — Play Console

### 3.1 Create developer account
- https://play.google.com/console/signup
- $25 one-time fee
- Identity verification — Google emails you a code, you submit a government ID. Takes 1–48 hours. **Start this before you need it.**

### 3.2 Create the app
Console → All apps → **Create app**
- App name: `Baby Food`
- Default language: English (United States)
- Type: **App**
- Free or paid: **Free**
- Confirm declarations.

### 3.3 Fill out Store Listing
Use everything in `docs/play-store/listing.md`. The 8 phone screenshots are in `docs/play-store/screenshots/`.

You'll still need to produce: **app icon (512×512)** and **feature graphic (1024×500)** — see `feature-graphic-spec.md`.

### 3.4 App content
Walk through every section in the left-nav "App content" block. The non-trivial ones map to:
- **Privacy policy** → `https://<your-prod-domain>/privacy`
- **App access** → "All functionality is available without restrictions" (uncheck "All or some functionality is restricted")
- **Ads** → No ads
- **Content rating** → Use `content-rating.md` answers
- **Target audience** → 18+ (this is a parent-facing app; do **not** tick "appeals to children")
- **News app** → No
- **Data safety** → Use `data-safety.md`
- **Government apps** → No
- **Financial features** → None
- **Health features** → None (this is a logging app, not a medical device — don't tick anything in this section)
- **Connecting actions** → None

### 3.5 Internal testing track
1. Testing → Internal testing → Create new release.
2. Upload `app-release-bundle.aab`.
3. Release name: `0.1.0` (or whatever).
4. Release notes: `Initial internal build.`
5. Add testers: enter your email + your partner's. Share the opt-in link Play generates.
6. Save → Review release → Roll out.

Wait ~10 minutes for Google to process the upload. Tap the opt-in link on your phone, install via Play, run through the app.

### 3.6 Closed → Open → Production
Once internal testing has burned for 1+ days with no critical bugs:
1. **Closed testing** → invite ~10 people. Run a week.
2. **Open testing** → public beta link. Run a week.
3. **Production** → submit. **First-submission review takes 1–7 days.**

---

## Phase 4 — Ongoing

### Web changes
Just push to main. Vercel deploys, the wrapper picks it up next launch. No new AAB.

### Wrapper changes (icon, theme, target SDK)
```bash
cd baby-food-twa
# edit twa-manifest.json — bump appVersion + appVersionCode
bubblewrap update
bubblewrap build
# upload the new .aab to Play Console
```

`appVersionCode` must increment every release (Google will reject if you reuse one).

### Rotation hygiene
- VAPID, CRON_SECRET, SHARE_LINK_SECRET — safe to rotate any time.
- TOTP_ENCRYPTION_KEY — rotating invalidates all existing 2FA enrolments. Only rotate if leaked.
- The Android keystore — **never rotate**. Once you upload to Play Console, the app is bound to that keystore for life.

---

## What to do if Play rejects

The most common rejections, with fixes:

| Symptom | Fix |
| --- | --- |
| "Privacy policy URL does not address ___ data type" | Open `app/privacy/page.tsx`, add the missing data type, redeploy, resubmit. |
| "TWA shows browser URL bar" | Asset links wrong. Re-verify `https://<prod>/.well-known/assetlinks.json` matches `keytool -list -v -keystore android.keystore` SHA-256. |
| "App targets minimum SDK below requirement" | `bubblewrap update` to bump targetSdkVersion to whatever Google's current floor is. |
| "Data Safety form inconsistent with policy" | Cross-check `data-safety.md` against `app/privacy/page.tsx`. They must agree on every collected data type. |
| "App requires sign-in but no test credentials" | In the **App access** section of App content, provide the test user creds: `e2e-tester@example.com` / `Test123!password` |
