export default function MyItemsPage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        What I&apos;m Sharing
      </h2>
      <p className="text-sm text-gray-500">
        Post, edit, and manage your own items here — wired to{" "}
        <code>items</code> (owner_id = current user) in the data-layer step.
      </p>
    </div>
  );
}
