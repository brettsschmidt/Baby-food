/**
 * Branded HTML for the three transactional emails Supabase sends. Paste these
 * into Supabase Auth → Email templates, replacing the existing copies.
 *
 * Supabase variables: {{ .Token }}, {{ .ConfirmationURL }}, {{ .Email }}, etc.
 * Docs: https://supabase.com/docs/guides/auth/auth-email-templates
 */

export const MAGIC_LINK_HTML = `
<!doctype html>
<html><body style="font-family: ui-sans-serif, system-ui; background:#f6f6f6; padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #eee;">
    <tr><td style="padding:24px; text-align:center;">
      <div style="font-size:40px;">🥕</div>
      <h1 style="margin:8px 0 4px; font-size:20px;">Sign in to Baby Food</h1>
      <p style="color:#666; margin:0 0 24px;">Tap the button below on the device you want to sign in on.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#3f9d4a; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Sign in</a>
      <p style="color:#999; font-size:12px; margin-top:24px;">Link expires in 1 hour. If you didn't ask for this, ignore this email.</p>
    </td></tr>
  </table>
</body></html>
`;

export const INVITE_HTML = `
<!doctype html>
<html><body style="font-family: ui-sans-serif, system-ui; background:#f6f6f6; padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #eee;">
    <tr><td style="padding:24px; text-align:center;">
      <div style="font-size:40px;">👶</div>
      <h1 style="margin:8px 0 4px; font-size:20px;">You've been invited to Baby Food</h1>
      <p style="color:#666; margin:0 0 24px;">Set up your account to start sharing baby food data with your partner.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#3f9d4a; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Accept invite</a>
    </td></tr>
  </table>
</body></html>
`;

export const RECOVERY_HTML = `
<!doctype html>
<html><body style="font-family: ui-sans-serif, system-ui; background:#f6f6f6; padding:24px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; border:1px solid #eee;">
    <tr><td style="padding:24px; text-align:center;">
      <div style="font-size:40px;">🔐</div>
      <h1 style="margin:8px 0 4px; font-size:20px;">Reset your password</h1>
      <p style="color:#666; margin:0 0 24px;">Tap the button below to choose a new password.</p>
      <a href="{{ .ConfirmationURL }}" style="display:inline-block; background:#3f9d4a; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">Reset password</a>
      <p style="color:#999; font-size:12px; margin-top:24px;">If you didn't request this, ignore the email.</p>
    </td></tr>
  </table>
</body></html>
`;
