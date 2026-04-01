"use client";

import { useState } from "react";
import { Play } from "lucide-react";

interface SimulationVideoProps {
  src: string;
  title: string;
  caption?: string;
  type?: "youtube" | "self-hosted";
  poster?: string;
  className?: string;
}

function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&]+)/,
    /(?:youtu\.be\/)([^?]+)/,
    /(?:youtube\.com\/embed\/)([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function SimulationVideo({
  src,
  title,
  caption,
  type = "self-hosted",
  poster,
  className = "",
}: SimulationVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (type === "youtube") {
    const videoId = getYouTubeId(src) || src;

    if (!isPlaying) {
      return (
        <figure className={className}>
          <button
            onClick={() => setIsPlaying(true)}
            className="relative w-full aspect-video rounded-lg overflow-hidden bg-card border border-border group cursor-pointer"
            aria-label={`Play ${title}`}
          >
            <img
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt={title}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 768px"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors group-hover:bg-black/40">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center transition-transform group-hover:scale-110">
                <Play className="w-7 h-7 text-primary-foreground ml-1" />
              </div>
            </div>
          </button>
          {caption && (
            <figcaption className="mt-2 text-sm text-muted-foreground text-center">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    }

    return (
      <figure className={className}>
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card border border-border">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
        {caption && (
          <figcaption className="mt-2 text-sm text-muted-foreground text-center">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // Self-hosted video
  return (
    <figure className={className}>
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card border border-border">
        <video
          src={src}
          poster={poster}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
        >
          <track kind="captions" />
          Your browser does not support the video tag.
        </video>
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-muted-foreground text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
