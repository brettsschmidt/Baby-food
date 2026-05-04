import "server-only";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "Push notifications need NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY. Generate with `npx web-push generate-vapid-keys`.",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

interface Notification {
  title: string;
  body: string;
  url?: string;
}

/** Send a push notification to every member of a household except the actor. */
export async function notifyHousehold(
  householdId: string,
  excludeUserId: string | null,
  notification: Notification,
) {
  if (!process.env.VAPID_PRIVATE_KEY) return; // silently no-op until configured
  configure();

  const admin = createAdminClient();
  const { data: members } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", householdId);

  let userIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== excludeUserId);

  if (userIds.length > 0) {
    const { data: prefs } = await admin
      .from("household_member_prefs")
      .select("user_id, quiet_hours_start, quiet_hours_end")
      .eq("household_id", householdId)
      .in("user_id", userIds);
    const hourNow = new Date().getUTCHours();
    const blocked = new Set<string>();
    for (const p of prefs ?? []) {
      if (p.quiet_hours_start == null || p.quiet_hours_end == null) continue;
      const a = p.quiet_hours_start;
      const b = p.quiet_hours_end;
      const inWindow = a <= b ? hourNow >= a && hourNow < b : hourNow >= a || hourNow < b;
      if (inWindow) blocked.add(p.user_id);
    }
    userIds = userIds.filter((id) => !blocked.has(id));
  }

  if (userIds.length === 0) return;

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  await Promise.all(
    (subs ?? []).map(async (s) => {
      const subscription: WebPushSubscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(notification));
        await admin
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", s.id);
      } catch (err: unknown) {
        // 404/410 means the subscription is dead; clean up.
        if (
          typeof err === "object" &&
          err &&
          "statusCode" in err &&
          ((err as { statusCode: number }).statusCode === 404 ||
            (err as { statusCode: number }).statusCode === 410)
        ) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
}
