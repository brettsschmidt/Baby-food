export const metadata = { title: "Privacy — Baby Food" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 prose prose-sm">
      <h1>Privacy Policy</h1>
      <p>Last updated: 2026-05-04</p>

      <h2>What we collect</h2>
      <p>Baby Food stores only what you enter or actively opt into:</p>
      <ul>
        <li>
          <strong>Account.</strong> Your email address (for sign-in via magic link or password) and
          a display name.
        </li>
        <li>
          <strong>Household content.</strong> The household name, baby names and birth dates,
          foods, recipes, prep plans, inventory items, feedings, growth measurements, sleep logs,
          diaper logs, supplements, milestones, shopping list items, and notes you record.
        </li>
        <li>
          <strong>Photos.</strong> Any images you upload (food photos, memories) are stored in
          encrypted object storage and are visible only to members of your household.
        </li>
        <li>
          <strong>Push notification endpoints.</strong> If you opt in to push notifications, your
          browser&apos;s subscription endpoint and public keys are stored so we can deliver alerts.
          You can disable this at any time.
        </li>
        <li>
          <strong>Two-factor secrets.</strong> If you enable 2FA, the TOTP secret is encrypted at
          rest with AES-256-GCM and is decryptable only by our servers.
        </li>
        <li>
          <strong>Error logs.</strong> If the app crashes, we record the error message, stack
          trace, page URL, and your browser user-agent so we can fix it. No personal data is
          included.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect analytics identifiers, advertising IDs, location, or
        contact lists. We do not use third-party advertising or tracking SDKs.
      </p>

      <h2>Voice quick-log</h2>
      <p>
        The optional voice quick-log uses your browser&apos;s built-in speech recognition. On most
        Android phones this means the audio is processed by Google&apos;s speech service under
        Google&apos;s privacy policy. Baby Food does not record or store the audio itself — only
        the resulting text, and only when you trigger a log.
      </p>

      <h2>How data is shared</h2>
      <p>
        Data is visible only to members of the household you create or join via an invite code, or
        to people you explicitly send a read-only share link to. We never sell or rent your data,
        and we do not share it with advertisers.
      </p>
      <p>
        If you opt in to the &ldquo;Shared foods&rdquo; setting, the foods you introduce are added
        to a community catalog in <em>anonymous, aggregated</em> form (food name, age range, no
        identifiers). You can opt out at any time.
      </p>

      <h2>Where data lives</h2>
      <p>
        Data is stored in our Supabase Postgres database and Supabase Storage, hosted on AWS in
        the United States. Access is gated by Postgres row-level security tied to your account, so
        no other user can see your data.
      </p>

      <h2>Children</h2>
      <p>
        Baby Food is designed for parents and caregivers, not for use by children. Although the
        app records information <em>about</em> a child (e.g. a baby&apos;s name and birth date),
        the account holder is always the parent or caregiver. We do not knowingly create accounts
        for children under 13.
      </p>

      <h2>Your controls</h2>
      <ul>
        <li>
          <strong>Export.</strong> From <em>Settings → Export</em> you can download a copy of your
          household&apos;s data as JSON.
        </li>
        <li>
          <strong>Deletion.</strong> From <em>Settings → Account</em> you can delete your account.
          This wipes your profile, your memberships, and any household where you are the sole
          owner. The deletion is immediate and unrecoverable.
        </li>
        <li>
          <strong>Email.</strong> If you can&apos;t access the in-app deletion (lost device,
          locked out), email <a href="mailto:brettsschmidt@gmail.com">brettsschmidt@gmail.com</a>{" "}
          and we&apos;ll process the request within 30 days.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections are TLS-encrypted end-to-end. Photos and database rows are encrypted at rest
        by AWS / Supabase. Authentication uses Supabase Auth (signed JWTs), with optional
        TOTP-based 2FA.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy as the app evolves. The &ldquo;Last updated&rdquo; date above
        reflects the most recent change. Material changes (e.g. new data types collected) will be
        announced in-app before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests:{" "}
        <a href="mailto:brettsschmidt@gmail.com">brettsschmidt@gmail.com</a>.
      </p>
    </main>
  );
}
