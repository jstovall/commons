// Reads GPS coordinates directly from a photo's EXIF metadata, before
// compression strips it. Returns null for the (common) case where a photo
// has no location data — camera location services off, a downloaded
// image, etc. — not an error, just nothing to prefill the map with.
export async function extractGpsFromFile(
  file: File
): Promise<{ lat: number; lng: number } | null> {
  try {
    const { gps } = await import("exifr");
    const result = await gps(file);
    if (!result) return null;
const { latitude, longitude } = result;
if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
return { lat: latitude, lng: longitude };
  } catch {
    return null;
  }
}