import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { removeMember, updateMemberRole, regenerateInviteCode } from "@/app/actions";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myMembership } = await supabase
    .from("neighborhood_members")
    .select("neighborhood_id, neighborhood:neighborhoods(name, invite_code)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!myMembership) redirect("/browse");

  const { data: members, error } = await supabase
    .from("neighborhood_members")
    .select("user_id, role, joined_at, profile:profiles(display_name)")
    .eq("neighborhood_id", myMembership.neighborhood_id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });
  if (error) console.error("Admin members query error:", error);

  return (
    <div>
      <h2 className="commons-heading mb-1 text-3xl">
        {myMembership.neighborhood?.name} Commons
      </h2>

      <div className="commons-card-flat mt-4 p-4">
        <p className="font-mono text-xs font-bold uppercase">Invite code</p>
        <p className="commons-heading text-2xl">
          {myMembership.neighborhood?.invite_code}
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
        {members?.map((m) => (
          <div
            key={m.user_id}
            className="commons-card-flat flex items-center justify-between gap-3 p-3"
          >
            <div>
              <p className="text-sm font-bold">{m.profile?.display_name}</p>
              <span className="commons-stamp commons-stamp-olive mt-1 inline-block">
                {m.role}
              </span>
            </div>
            {m.user_id !== user.id && (
              <div className="flex items-center gap-2">
                <form action={updateMemberRole} className="flex items-center gap-1">
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <select name="role" defaultValue={m.role} className="commons-input text-xs">
                    <option value="member">member</option>
                    <option value="moderator">moderator</option>
                    <option value="admin">admin</option>
                  </select>
                  <button className="commons-button text-xs">Save</button>
                </form>
                <form action={removeMember}>
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button className="commons-button commons-button-danger text-xs">
                    Remove
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}