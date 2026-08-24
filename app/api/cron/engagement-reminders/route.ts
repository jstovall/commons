import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReminderEmailHtml } from "@/lib/reminder-email";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: candidates, error } = await admin.rpc(
    "get_pending_engagement_reminders"
  );
  if (error) {
    console.error("get_pending_engagement_reminders error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const c of candidates ?? []) {
    const isLogin = c.kind === "login";

    const html = buildReminderEmailHtml(
      isLogin
        ? {
            heading: "You're almost in!",
            bodyText:
              "You confirmed your email a couple days ago but haven't signed in yet. Your neighborhood is waiting — jump back in whenever you're ready.",
            ctaLabel: "Sign in",
            ctaUrl: "https://www.tacoma-commons.com/login",
          }
        : {
            heading: "Get the full Commons experience",
            bodyText:
              "You've been using Commons in the browser — adding it to your home screen only takes a few seconds and unlocks notifications for new requests and messages. In Safari or Chrome, look for \"Add to Home Screen\" in the share/menu options.",
            ctaLabel: "Open Commons",
            ctaUrl: "https://www.tacoma-commons.com/browse",
          }
    );

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: '"Commons" <noreply@tacoma-commons.com>',
          to: [c.email],
          subject: isLogin
            ? "You're almost in — sign in to Commons"
            : "Don't forget to install Commons",
          html,
        }),
      });

      if (res.ok) {
        sent++;
        await admin
          .from("profiles")
          .update(
            isLogin
              ? { login_reminder_sent_at: new Date().toISOString() }
              : { install_reminder_sent_at: new Date().toISOString() }
          )
          .eq("id", c.user_id);
      } else {
        console.error("Resend send failed:", await res.text());
      }
    } catch (err) {
      console.error("Reminder email error:", err);
    }
  }

  return NextResponse.json({ sent, total: candidates?.length ?? 0 });
}