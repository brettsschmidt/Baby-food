# Play Store listing — copy-paste ready

Everything Play Console asks for in the **Store listing** section. Drop the values in as-is, then tweak voice if anything reads off.

> **Before you start:** the listing assumes the production URL is on a public HTTPS domain (e.g. Vercel). Set `NEXT_PUBLIC_SITE_URL` in Vercel to that URL before you submit, otherwise share-links and email confirmation redirects will be broken once the app is live.

---

## App name
```
Baby Food: Plan, Make, Log
```
*30 char limit. Currently 27.*

## Short description
```
Plan, make, and log every homemade meal — together with your partner.
```
*80 char limit. Currently 70.*

## Full description
*Up to 4000 characters. Currently ~1900.*

```
Baby Food is the calmest way for two parents to share the work of homemade baby food.

Make a batch of sweet potato puree on Sunday, log who fed Mila what on Tuesday, and see at a glance what's left in the freezer on Friday — without ever asking your partner "did you write that down?"

WHAT YOU CAN DO

• Log feedings in seconds. Pick from your inventory, type a custom food, or just say it out loud. Whoever logs first gets credit; the other phone updates instantly.

• Track the freezer. Every cube, jar, pouch, or fridge container with its expiry date and quantity. The app warns you before a food goes off and tells you what to use up first.

• Plan a prep session. Schedule the next batch-cook on a date, link it to a recipe, and the yield auto-creates the inventory line when you mark it done.

• Save your recipes. Sweet potato cubes, banana mash, chicken & lentil stew. Group them into collections — "first foods," "freezer-friendly," "things they actually like."

• Keep a shopping list. Add items as you think of them; check them off in the store.

• Track allergens. Mark the first time baby tries a new food. The library remembers what's been introduced and when, so you don't second-guess the egg you served three weeks ago.

• Beyond food. Diapers, sleep, growth measurements, supplements, milestones, memories with photos.

• Two phones in sync, in real time. Invite your partner with a code; whatever one of you logs shows up on the other phone in seconds.

• Read-only share links. For grandparents who want to see what their grandbaby is eating without signing up — a single URL, scope-limited (feedings only, growth only, or full view), and revocable any time.

WHAT WE DON'T DO

• No ads.
• No selling your data.
• No tracking, no analytics SDKs, no advertising IDs.
• No subscriptions or in-app purchases.
• Your photos and feeding history live encrypted and visible only to people you invite.

DESIGNED FOR THE TWO HANDS YOU HAVE

The screens are designed for one-handed use. Big tap targets. A voice quick-log when both hands are busy. A "same as last" button when you're feeding a leftover. An offline mode for the park.

WORKS LIKE AN APP, BUILT LIKE A WEB APP

Baby Food installs to your home screen and runs fullscreen, just like any other app. There's no separate iOS / Android codebase to fall behind. Updates ship the moment we deploy them — no Play Store wait, no broken pinned versions.

Two parents. One source of truth. A freezer that always has dinner.
```

---

## Categorization

| Field | Value |
| --- | --- |
| Category | **Parenting** |
| Tags (3) | Family planning, Meal planning, Baby tracking |
| Email | `brettsschmidt@gmail.com` (recommend swapping for a dedicated `support@` once you have a domain) |
| Website | `https://<your-prod-domain>` |
| Privacy policy | `https://<your-prod-domain>/privacy` |

---

## Graphics

| Asset | Spec | Status |
| --- | --- | --- |
| App icon | 512×512 PNG | **TODO** — Play Store icon is separate from PWA icon. Recommend using the carrot mark on a solid `#3f9d4a` background, padded so it survives Play's circle/square mask. |
| Feature graphic | 1024×500 PNG | **TODO** — see `feature-graphic-spec.md` |
| Phone screenshots | 1080×1920 PNG | ✅ in `screenshots/` (8 ready) |
| Tablet screenshots (7", 10") | optional | Skip for v1 — Play accepts phone-only listings |

### Screenshot caption suggestions
*(Play lets you overlay text on screenshots. Caption ideas if you want to do that — otherwise the bare images work too.)*

| File | Suggested caption |
| --- | --- |
| `1-dashboard.png` | "Today, at a glance" |
| `2-feedings-timeline.png` | "Every feeding, in one timeline" |
| `3-feedings-new.png` | "One-tap logging" |
| `4-inventory.png` | "Know what's left in the freezer" |
| `5-library.png` | "Your family's food catalog" |
| `6-recipes.png` | "Save what works" |
| `7-care.png` | "Diapers, sleep, supplements — all here" |
| `8-growth.png` | "Track every milestone" |

---

## App content (mandatory questionnaires)

See `data-safety.md` and `content-rating.md` in this folder.

---

## Localization
v1: **English (US)** only. Add languages once you have demand.

## Pricing
**Free**, no in-app purchases.

## Distribution

| Track | Recommended audience |
| --- | --- |
| Internal testing | You + your partner only (first 1–2 days) |
| Closed testing | Friends + family (~10 testers, week 1) |
| Open testing | Public beta with a Play link (week 2–3, optional) |
| Production | Once Open testing surfaces no critical bugs (week 3+) |

Countries: **all** (no need to restrict — there's nothing region-specific).
