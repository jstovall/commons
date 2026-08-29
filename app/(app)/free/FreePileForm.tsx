"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createFreePile } from "@/app/actions";
import ImageFileInput from "../my-items/ImageFileInput";
import { extractGpsFromFile } from "@/lib/exif-location";

const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false });

// Rough Tacoma-area fallback center, used only when a photo has no GPS
// data and the user hasn't yet adjusted the pin themselves.
const FALLBACK_CENTER = { lat: 47.2529, lng: -122.4443 };

export default function FreePileForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [mapKey, setMapKey] = useState("default");
  const [location, setLocation] = useState(FALLBACK_CENTER);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

async function handleRawFile(file: File) {
  try {
    const gps = await extractGpsFromFile(file);
    if (gps) {
      setLocation(gps);
      setMapKey(`${gps.lat}-${gps.lng}`);
      setLocationNote("Found a location in this photo — drag the pin if it's not quite right.");
    } else {
      setLocationNote(null);
    }
  } catch (err) {
    setLocationNote(
      `EXIF read failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("latitude", String(location.lat));
    formData.set("longitude", String(location.lng));

    startTransition(async () => {
      await createFreePile(formData);
      formRef.current?.reset();
      setFormKey((k) => k + 1);
      setLocation(FALLBACK_CENTER);
      setMapKey("default");
      setLocationNote(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="commons-card mb-8 p-4"
    >
      <summary className="cursor-pointer font-mono text-sm font-bold">
        + post a free pile
      </summary>
      <form ref={formRef} onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
        <input name="title" required placeholder="What's out there?" className="commons-input text-sm" />
        <textarea name="description" placeholder="Any details…" className="commons-input text-sm" />
        <input
          name="location"
          placeholder="Where (e.g. curb at 5th & Oak)"
          className="commons-input text-sm"
        />
        <ImageFileInput
          key={formKey}
          name="image_file"
          label="Photo (optional)"
          onRawFile={handleRawFile}
        />

        <label className="font-mono text-xs font-bold uppercase">
          Pin the location
          {locationNote && (
            <p className="mt-1 font-mono text-[10px] font-normal normal-case text-commons-teal">
              {locationNote}
            </p>
          )}
          <div className="mt-1">
            <LocationPicker
              key={mapKey}
              initialLat={location.lat}
              initialLng={location.lng}
              onLocationChange={(lat, lng) => setLocation({ lat, lng })}
            />
          </div>
        </label>

        <button disabled={isPending} className="commons-button self-start text-sm disabled:opacity-50">
          {isPending ? "Posting…" : "Post pile"}
        </button>
      </form>
    </details>
  );
}