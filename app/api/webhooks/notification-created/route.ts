import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  "mailto:hello@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const notification = body.record;
  if (!notification) {
    return NextResponse.json({ error: "No record in payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: channelData } = await admin.rpc("get_channel_and_email", {
    _user_id: notification.user_id,
  });
  const channel = channelData?.[0]?.channel ?? "email";
  const recipientEmail = channelData?.[0]?.email;

  if (channel === "off") {
    return NextResponse.json({ sent: 0, channel: "off" });
  }

  if (channel === "email") {
    if (!recipientEmail) {
      return NextResponse.json({ sent: 0, channel: "email", error: "no email found" });
    }

    const { buildNotificationEmailHtml } = await import("@/lib/notification-email");
    const html = buildNotificationEmailHtml({
      title: notification.title,
      body: notification.body ?? "",
      linkUrl: `https://www.tacoma-commons.com${notification.link_url ?? "/browse"}`,
    });

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: '"Commons" <noreply@tacoma-commons.com>',
          to: [recipientEmail],
          subject: notification.title,
          html,
        }),
      });
      if (!res.ok) {
        console.error("Notification email send failed:", await res.text());
        return NextResponse.json({ sent: 0, channel: "email" });
      }
      return NextResponse.json({ sent: 1, channel: "email" });
    } catch (err) {
      console.error("Notification email error:", err);
      return NextResponse.json({ sent: 0, channel: "email" });
    }
  }

  // channel === "push" — existing behavior, unchanged below
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.link_url || "/browse",
  });

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (uninstalled, expired) — clean it up.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Push send failed:", err);
        }
      }
    })
  );

  return NextResponse.json({ sent });
}