import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/current-neighborhood";
import { updateProfile, signOutAction, switchNeighborhood } from "@/app/actions";
import NotificationsToggle from "./NotificationsToggle";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

const { memberships, current } = await getCurrentMembership(user.id);

  const initials = (profile?.display_name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="commons-heading mb-4 text-3xl">Your profile</h2>

        <div className="commons-card-flat flex items-center gap-4 p-4">
<div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-commons-ink bg-commons-ochre font-mono text-lg font-bold">
  {initials}
</div>
          <div>
            <p className="commons-heading text-xl leading-none">
              {profile?.display_name}
            </p>
            <p className="font-mono text-xs text-commons-ink/70">
              {user.email}
            </p>
          </div>
        </div>

        <form action={updateProfile} className="commons-card-flat mt-4 flex flex-col gap-3 p-4">
          <label className="font-mono text-xs font-bold uppercase">
            Display name
            <input
              name="display_name"
              required
              defaultValue={profile?.display_name ?? ""}
              className="commons-input mt-1 w-full text-sm font-body normal-case"
            />
          </label>
          <button className="commons-button self-start text-sm">
            Save profile
          </button>
        </form>
      </div>

{memberships.length > 0 && (
  <div>
    <h3 className="mb-3 font-mono text-sm font-bold uppercase">
      {memberships.length > 1 ? "Your neighborhoods" : "Your neighborhood"}
    </h3>
    <div className="flex flex-col gap-3">
      {memberships.map((m) => {
        const isCurrent = m.neighborhood_id === current?.neighborhood_id;
        return (
          <div key={m.neighborhood_id} className="commons-card-flat flex items-center justify-between p-4">
            <div>
              <p className="commons-heading text-lg leading-tight">
                {m.neighborhood?.name} Commons
              </p>
              <span className="commons-stamp commons-stamp-olive mt-1 inline-block">
                {m.role}
              </span>
            </div>
            {isCurrent ? (
              <span className="font-mono text-xs font-bold text-commons-teal">
                current
              </span>
            ) : (
              <form action={switchNeighborhood}>
                <input type="hidden" name="neighborhood_id" value={m.neighborhood_id} />
                <button className="commons-button commons-button-secondary text-xs">
                  Switch
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}
<NotificationsToggle />
<a
  href="/feedback"
  className="commons-button commons-button-secondary self-start text-sm"
>
  Send feedback
</a>


      <form action={signOutAction}>
        <button className="commons-button commons-button-secondary self-start text-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}