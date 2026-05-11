"use client";

import { useEffect, useRef } from "react";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import { VideoMetadata } from "@/lib/types";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: unknown }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        }
      ) => unknown;
      PlayerState: { PLAYING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Props {
  metadata: VideoMetadata;
}

export default function VideoPlayer({ metadata }: Props) {
  const { registerPlayer } = useVideoPlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initPlayer = () => {
      const player = new window.YT.Player("yt-player", {
        videoId: metadata.video_id,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            registerPlayer(e.target as Parameters<typeof registerPlayer>[0]);
          },
        },
      });
      void player;
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existing = document.getElementById("yt-iframe-api");
      if (!existing) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      window.onYouTubeIframeAPIReady = initPlayer;
    }
  }, [metadata.video_id, registerPlayer]);

  return (
    <div ref={containerRef} className="w-full">
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <div
          id="yt-player"
          className="absolute inset-0 w-full h-full rounded-xl overflow-hidden bg-black"
        />
      </div>
      <div className="mt-3">
        <p className="text-sm font-medium text-[#111827] line-clamp-2 leading-snug">
          {metadata.title}
        </p>
        <p className="text-xs text-[#6B7280] mt-0.5">{metadata.author}</p>
      </div>
    </div>
  );
}
