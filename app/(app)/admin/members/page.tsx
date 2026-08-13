import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import {
  removeMember,
  updateMemberRole,
  regenerateInviteCode,
  startAdminMemberThread,
} from "@/app/actions";
import { formatDate } from "@/lib/format";

const PLATFORM_ICON: Record<string, string> = {
  ios: "🍎 iOS",
  android: "🤖 Android",
  other: "💻 Web",
};


export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { current: myMembership } = await getCurrentMembership(user.id);
  if (!myMembership) redirect("/browse");
  if (myMembership.role !== "admin") redirect("/admin/reports");

  const { data: neighborhoodDetails } = await supabase
    .from("neighborhoods")
    .select("name, invite_code")
    .eq("id", myMembership.neighborhood_id)
    .maybeSingle();

  const { data: members, error } = await supabase
    .from("neighborhood_members")
    .select(
      `user_id, role, joined_at,
       profile:profiles(display_name, platform, last_standalone_at)`
    )
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (error) console.error("Admin members query error:", error);

const { data: notifStatus, error: notifError } = await supabase.rpc(
  "get_notification_status",
  { _neighborhood_id: myMembership.neighborhood_id }
);
if (notifError) console.error("Notification status query error:", notifError);
const subscribedIds = new Set(
  (notifStatus ?? []).filter((n) => n.has_subscription).map((n) => n.user_id)
);

  const { data: neighborhoodItems } = await supabase
    .from("items")
    .select("owner_id")
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .eq("is_active", true);
  const itemCountMap = new Map<string, number>();
  for (const item of neighborhoodItems ?? []) {
    itemCountMap.set(item.owner_id, (itemCountMap.get(item.owner_id) ?? 0) + 1);
  }

  const { data: lastLogins, error: loginsError } = await supabase.rpc(
    "get_last_sign_ins",
    { _neighborhood_id: myMembership.neighborhood_id }
  );
  if (loginsError) console.error("Last logins query error:", loginsError);
  const lastLoginMap = new Map(
    (lastLogins ?? []).map((l) => [l.user_id, l.last_sign_in_at])
  );

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">
        {neighborhoodDetails?.name} Commons
      </h2>

      <div className="commons-card-flat mt-4 p-4">
        <p className="font-mono text-xs font-bold uppercase">Invite code</p>
        <p className="commons-heading text-2xl">
          {neighborhoodDetails?.invite_code}
        </p>
        <form action={regenerateInviteCode} className="mt-2">
          <button className="commons-button commons-button-secondary text-xs">
            Regenerate code
          </button>
        </form>
        <p className="mt-1 text-xs text-commons-ink/60">
          Regenerating immediately invalidates the old code for anyone who
          hasn&apos;t joined yet.
        </p>
      </div>

      <h3 className="mb-3 mt-8 font-mono text-sm font-bold uppercase">
        Members
      </h3>
      <div className="flex flex-col gap-3">
        {members?.map((m) => {
          const installed = Boolean(m.profile?.last_standalone_at);
          const notifOn = subscribedIds.has(m.user_id);
          const itemCount = itemCountMap.get(m.user_id) ?? 0;
          const lastLogin = lastLoginMap.get(m.user_id) ?? null;

          return (
            <div key={m.user_id} className="commons-card-flat p-3">
              <p className="text-sm font-bold">{m.profile?.display_name}</p>
              <span className="commons-stamp commons-stamp-olive mt-1 inline-block">
                {m.role}
              </span>

              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[10px] text-commons-ink/60">
                <span title={notifOn ? "Notifications enabled" : "Notifications off"}>
                  {notifOn ? "🔔" : "🔕"}
                </span>
                <span title="Active items shared">
                  🏷️ {itemCount}
                </span>
<span title="Last login">
  🕓 {lastLogin ? formatDate(lastLogin) : "never"}
</span>
                {installed && (
                  <span title="Installed platform">
                    {PLATFORM_ICON[m.profile?.platform ?? "other"]}
                  </span>
                )}
              </div>

              {m.user_id !== user.id && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-mono text-xs font-bold">
                    manage
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    <form action={updateMemberRole} className="flex items-center gap-1">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="commons-input flex-1 text-xs"
                      >
                        <option value="member">member</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                      <button className="commons-button text-xs">Save</button>
                    </form>

                    <form action={startAdminMemberThread}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="commons-button commons-button-secondary w-full text-xs">
                        💬 Message
                      </button>
                    </form>

                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <button className="commons-button commons-button-danger w-full text-xs">
                        Remove
                      </button>
                    </form>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}