# Baby Food

A mobile-first PWA for two parents to plan, make, inventory, and log homemade baby food.
Shipped to the Play Store as a Trusted Web Activity.

## Stack

- **Next.js 16** (App Router, Server Actions) + **TypeScript** + **Tailwind v4**
- **shadcn/ui** components
- **Supabase** — Postgres + Auth + Row Level Security
- **Serwist** for the PWA service worker
- **Playwright** for E2E tests
- **Vercel** for hosting; **Bubblewrap** for the Android wrapper

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

Open <http://localhost:3000>.

### Supabase

1. Create a project at <https://supabase.com>.
2. Apply the schema: in the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Generate the typed client (after `supabase login` + `supabase link`):

```bash
npm run db:types
```

### Auth redirect URL

In Supabase → Authentication → URL Configuration, add:

- Site URL: `http://localhost:3000` (and your prod URL)
- Redirect URLs: `http://localhost:3000/auth/callback`, `https://*-yourteam.vercel.app/auth/callback`

## Scripts

- `npm run dev` — local dev server (webpack; serwist isn't Turbopack-ready yet).
- `npm run build` — production build.
- `npm run typecheck` — strict TS check.
- `npm run lint` — ESLint.
- `npm run test:e2e` — Playwright E2E (point at a dedicated test Supabase project via `.env.test.local`).

## Walking the happy path

1. `/login` → enter email → magic link → `/auth/callback` → `/onboarding`.
2. Create household, add baby.
3. `/inventory/new` → add a frozen cube of puree.
4. `/feedings/new` → log the feeding from the dropdown.
5. `/feedings` → see it on the timeline.
6. `/settings` → mint an invite code; second parent visits `/onboarding/join?code=...`.

## Play Store

See [`docs/play-store.md`](docs/play-store.md). The TL;DR: deploy the PWA, replace
`public/.well-known/assetlinks.json` with the file Bubblewrap generates, then
`bubblewrap init && bubblewrap build && upload .aab`.
