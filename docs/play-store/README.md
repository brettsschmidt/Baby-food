# Play Store deployment kit

Everything Play Console asks for, pre-filled. Walk the checklist in order.

## Files

| File | What it is |
| --- | --- |
| [`deploy-checklist.md`](deploy-checklist.md) | **Start here.** Step-by-step from `git push` to "in Production." |
| [`listing.md`](listing.md) | App name, descriptions, categorization. Copy-paste into Play Console. |
| [`data-safety.md`](data-safety.md) | Answer key for the Data Safety questionnaire. |
| [`content-rating.md`](content-rating.md) | Answer key for the IARC content rating wizard. |
| [`feature-graphic-spec.md`](feature-graphic-spec.md) | Brief for the 1024×500 feature graphic (still needs to be designed). |
| [`screenshots/`](screenshots) | 8 phone screenshots at Play Store spec (1080×1920). |

## Outstanding human work

1. **App icon** (512×512 PNG) — separate from PWA icon, needs designing.
2. **Feature graphic** (1024×500 PNG) — see `feature-graphic-spec.md`.
3. **Vercel deploy** — push to main and wire env vars per `deploy-checklist.md` § Phase 1.
4. **Pay $25** to Google Play Console.
5. **Bubblewrap** — install JDK 17, run `bubblewrap init` + `bubblewrap build`, back up the keystore.
6. **Update `assetlinks.json`** with the real keystore fingerprint and redeploy.
7. **Upload AAB** to Play Console internal testing.
8. **Submit for review** once internal testing is clean.

## Pre-flight code changes already made

- Privacy policy expanded to cover photos, push endpoints, voice, error logs, in-app deletion (`app/privacy/page.tsx`).
- Hydration bugs fixed across VoiceButton, PushToggle, and FeedingItemsField.
- `create_household` RPC added to fix onboarding RLS issue.
- 23 walk-through screenshots in `docs/screenshots/` for the user guide.
- 8 Play Store screenshots in `docs/play-store/screenshots/`.
- User guide at `docs/user-guide.md`.
