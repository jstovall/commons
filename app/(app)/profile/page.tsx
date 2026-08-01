export default function ProfilePage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        Your Profile
      </h2>
      <p className="text-sm text-gray-500">
        Create/edit profile, neighborhood address visibility toggle, and
        account deletion go here — wired to <code>profiles</code> +{" "}
        <code>neighborhood_members</code> in the data-layer step.
      </p>
    </div>
  );
}
