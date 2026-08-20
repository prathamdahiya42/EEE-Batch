'use client';

import { useState } from 'react';

interface ImageGalleryProps {
  urls: string[];
}

export default function ImageGallery({ urls }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      {/* Thumbnail grid */}
      <div
        className={`
          grid gap-2.5 mt-3.5
          ${urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}
        `}
      >
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightboxIndex(i)}
            className="relative rounded-2xl overflow-hidden bg-white/50 border border-white/80
                       hover:border-[#FF4F9A]/50 transition-all duration-200 shadow-sm
                       hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#FF4F9A]
                       group cursor-zoom-in aspect-4/3 flex items-center justify-center"
          >
            <img
              src={url}
              alt={`Note image ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-[#3D2C36]/0 group-hover:bg-[#3D2C36]/20 transition-all duration-200
                            flex items-center justify-center">
              <span className="p-2 rounded-full bg-white/80 text-[#FF4F9A] opacity-0 group-hover:opacity-100
                               transition-all duration-200 shadow-md backdrop-blur-xs transform group-hover:scale-100 scale-75">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-label="Image viewer"
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 p-2.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20
                       backdrop-blur-md rounded-full transition-all border border-white/20 z-10"
            aria-label="Close"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Navigation */}
          {urls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev - 1 + urls.length) % urls.length : 0
                  );
                }}
                className="absolute left-4 p-3 text-white/90 hover:text-white bg-white/10 hover:bg-white/20
                           backdrop-blur-md rounded-full transition-all border border-white/20 z-10"
                aria-label="Previous image"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev + 1) % urls.length : 0
                  );
                }}
                className="absolute right-4 p-3 text-white/90 hover:text-white bg-white/10 hover:bg-white/20
                           backdrop-blur-md rounded-full transition-all border border-white/20 z-10"
                aria-label="Next image"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* Full-size image */}
          <img
            src={urls[lightboxIndex]}
            alt={`Full-size note image ${lightboxIndex + 1}`}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Counter */}
          {urls.length > 1 && (
            <div className="absolute bottom-6 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white font-mono text-xs">
              {lightboxIndex + 1} / {urls.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
