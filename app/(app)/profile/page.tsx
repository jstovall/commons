import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateProfile, signOutAction } from "@/app/actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, profile_image_url")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("neighborhood_members")
    .select("role, neighborhood:neighborhoods(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

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
          {profile?.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_image_url}
              alt={profile.display_name ?? ""}
              className="h-14 w-14 rounded-full border-2 border-commons-ink object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-commons-ink bg-commons-ochre font-mono text-lg font-bold">
              {initials}
            </div>
          )}
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
          <label className="font-mono text-xs font-bold uppercase">
            Profile image URL (optional)
            <input
              name="profile_image_url"
              defaultValue={profile?.profile_image_url ?? ""}
              placeholder="https://…"
              className="commons-input mt-1 w-full text-sm font-body normal-case"
            />
          </label>
          <button className="commons-button self-start text-sm">
            Save profile
          </button>
        </form>
      </div>

      {membership && (
        <div>
          <h3 className="mb-3 font-mono text-sm font-bold uppercase">
            {membership.neighborhood?.name} Commons
          </h3>
          <div className="commons-card-flat p-4">
            <span className="commons-stamp commons-stamp-olive inline-block">
              {membership.role}
            </span>
          </div>
        </div>
      )}

      <form action={signOutAction}>
        <button className="commons-button commons-button-secondary self-start text-sm">
          Sign out
        </button>
      </form>
    </div>
  );
}