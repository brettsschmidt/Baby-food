# Branded email templates

This app exposes its three transactional email templates at `/api/email/<name>`:

- `https://<domain>/api/email/magic_link`
- `https://<domain>/api/email/invite`
- `https://<domain>/api/email/recovery`

To wire them into Supabase:

1. Open Supabase Dashboard → **Authentication → Email Templates**.
2. For each template (Magic Link, Invite User, Reset Password), click "Source HTML"
   and paste the body from the corresponding URL above.
3. Verify the variables Supabase provides (`{{ .ConfirmationURL }}` etc.) — they're
   already in the template strings.

The templates live in `lib/email-templates.ts`. Edit and redeploy; pull the new HTML
into the Supabase dashboard the same way.
