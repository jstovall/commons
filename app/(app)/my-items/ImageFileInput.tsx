"use client";

import { useRef, useState } from "react";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const SKIP_COMPRESSION_BELOW = 900 * 1024; // ~900KB

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      JPEG_QUALITY
    )
  );

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export default function ImageFileInput({
  name,
  label,
}: {
  name: string;
  label: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size <= SKIP_COMPRESSION_BELOW) {
      setStatus(null);
      return;
    }

    setStatus("Compressing photo…");
    try {
      const compressed = await compressImage(file);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(compressed);
      if (inputRef.current) inputRef.current.files = dataTransfer.files;
      setStatus(
        `Compressed ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024).toFixed(0)}KB`
      );
    } catch (err) {
      console.error("Image compression failed:", err);
      setStatus("Couldn't compress — try a smaller photo");
    }
  }

  return (
    <label className="font-mono text-xs font-bold uppercase">
      {label}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleChange}
        className="commons-input mt-1 w-full text-sm font-body normal-case"
      />
      {status && (
        <p className="mt-1 font-mono text-[10px] normal-case text-commons-teal">
          {status}
        </p>
      )}
    </label>
  );
}