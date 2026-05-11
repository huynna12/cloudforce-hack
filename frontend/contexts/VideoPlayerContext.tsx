"use client";

import { createContext, useContext, useRef, useCallback } from "react";

interface VideoPlayerContextValue {
  seekTo: (seconds: number) => void;
  registerPlayer: (player: YTPlayer) => void;
}

interface YTPlayer {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextValue>({
  seekTo: () => {},
  registerPlayer: () => {},
});

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const playerRef = useRef<YTPlayer | null>(null);

  const registerPlayer = useCallback((player: YTPlayer) => {
    playerRef.current = player;
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  }, []);

  return (
    <VideoPlayerContext.Provider value={{ seekTo, registerPlayer }}>
      {children}
    </VideoPlayerContext.Provider>
  );
}

export function useVideoPlayer() {
  return useContext(VideoPlayerContext);
}
