export default function BrowsePage() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-commons-dark">
        Available to Borrow
      </h2>
      <p className="text-sm text-gray-500">
        Item grid, search, and filters go here — wired to <code>items</code> +{" "}
        <code>favorites</code> + <code>loans</code> in the data-layer step.
      </p>
    </div>
  );
}
