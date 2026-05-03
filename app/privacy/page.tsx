export const metadata = { title: "Privacy — Baby Food" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 prose prose-sm">
      <h1>Privacy Policy</h1>
      <p>Last updated: 2026-05-02</p>

      <h2>What we collect</h2>
      <p>
        Baby Food stores only what you enter: your email address (for sign-in), the household name
        you create, the food items, prep plans, and feeding logs you record. We do not collect
        analytics, cookies for tracking, or third-party advertising identifiers.
      </p>

      <h2>How data is shared</h2>
      <p>
        Data is shared only between members of the household you create or join via an invite code.
        We never sell or rent your data.
      </p>

      <h2>Where data lives</h2>
      <p>
        Data is stored in our Supabase Postgres database hosted on AWS, accessible only via
        row-level security tied to your account.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Sign in and email <a href="mailto:support@example.com">support@example.com</a> to request
        deletion of your account and all associated data.
      </p>
    </main>
  );
}
