"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function PhotoLightbox({
  src,
  alt = "Photo",
  thumbnail,
}: {
  src: string;
  alt?: string;
  thumbnail: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${alt}`}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {thumbnail}
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-background/20 p-2 text-white"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <Image
            src={src}
            alt={alt}
            width={1024}
            height={1024}
            unoptimized
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
