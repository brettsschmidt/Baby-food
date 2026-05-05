# Data Safety form — answer key

Play Console will walk you through this in a wizard. Below is every question with the answer to pick. The form is the single biggest source of rejection delays — getting it right the first time saves a week.

> **Anchor truth:** match what the [privacy policy](../../app/privacy/page.tsx) says. If the form and the policy disagree, fix the policy first.

---

## 1. Data collection and security (top of form)

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (TLS) |
| Do you provide a way for users to request that their data be deleted? | **Yes** — in-app via Settings → Account, plus email |

---

## 2. Data types

For each row below, in Play Console: **toggle "Collected" = Yes**, optionally **toggle "Shared" = No** (we don't share with third parties — household members are not "third parties" per Google's definition; they're co-users).

### Personal info

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Email address | ✅ | ❌ | No (required for sign-in) | Account management |
| Name | ✅ | ❌ | Yes (display name only) | App functionality, Account management |

### Photos and videos

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Photos | ✅ | ❌ | Yes (only if you upload one) | App functionality |

### Audio files

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Voice or sound recordings | ❌ | — | — | We use the *browser's* SpeechRecognition API which streams to the OS/Google for transcription. **We never receive or store the audio itself, only the resulting text.** Per Google's guidance, you do **not** declare this — the SpeechRecognition API processing is covered by Google's own privacy policy. |

### Personal IDs / financial / location / contacts / messages / calendar / health / fitness
**❌ None collected.** Skip every entry in these sections.

### App activity

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| App interactions | ❌ | — | — | We don't track interactions for analytics. |
| In-app search history | ❌ | — | — | We don't store search history. |
| Other user-generated content | ✅ | ❌ | Yes | App functionality (feedings, recipes, notes — the core app data) |

### Web browsing
**❌ None collected.**

### App info and performance

| Data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Crash logs | ✅ | ❌ | No | App functionality (debugging) |
| Diagnostics (other) | ✅ | ❌ | No | App functionality (error stack, URL, user-agent on errors) |

> The error logs are minimal: message, stack, page URL, user-agent. They contain no personal IDs and no payload. Mention this verbatim in the form's free-text "Why we collect this" field.

### Device or other IDs
**❌ None.** We don't store device IDs. The push subscription endpoint is **not** a device ID per Google's definition — it's an opaque webpush URL. If asked, treat it as part of "Other user-generated content" or skip; Google's wizard does not have a row for "push endpoints" and FCM/webpush endpoints are not on the prohibited list.

---

## 3. Data security claims (free-text + checkboxes)

Tick all of:

- ☑ **Data is encrypted in transit** — yes, TLS everywhere.
- ☑ **You can request that data be deleted** — yes, in-app via Settings → Account, plus email fallback.
- ☑ **Data is encrypted at rest** — yes, AWS / Supabase encrypts disk storage; the TOTP secret is additionally AES-256-GCM-encrypted application-side.
- ☑ **Committed to follow Play Families policy** — only if you list under Parenting (recommended). The Families policy mainly forbids ads-to-kids, which doesn't apply (this app is for parents, not kids).
- ☐ **Designed for children** — leave unchecked. The app collects info *about* a child (name, birth date) but the user is always the parent.

---

## 4. Account creation

| Question | Answer |
| --- | --- |
| Does your app require an account? | **Yes** |
| What types of accounts? | **Email/password** + **Email magic link** |
| Is the account required to use the core functionality? | **Yes** |

---

## 5. Common follow-up questions Google asks

These come up in review emails. Pre-write your answer:

> **Q: Why does the app collect crash logs without making them optional?**
> A: Crash logs are limited to the error message, stack trace, current URL, and browser user-agent. They contain no personal data. They're used solely to fix bugs in production. We don't ship the app to anonymous users — every error is tied to an authenticated session, and sessions are deletable.

> **Q: How can a user delete their account from inside the app?**
> A: Settings → Security & Account → Delete account. The action is immediate. It removes the user's profile, memberships, and any household where they are the sole owner. Data shared with co-owners is preserved for those co-owners.

> **Q: How long do you retain data after deletion is requested?**
> A: Account-deletion is immediate and unrecoverable. Backups roll over within 30 days, after which all traces are gone.
