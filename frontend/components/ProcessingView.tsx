"use client";

import { CheckCircle, Loader2 } from "lucide-react";
import { AgentProgress, AgentStatus, VideoMetadata } from "@/lib/types";

interface Props {
  progress: AgentProgress;
  metadata: VideoMetadata | null;
  error: string | null;
}

// ── Error view — still centered (game doesn't matter when there's an error) ──
function ErrorView({ error }: { error: string }) {
  const hint =
    error.toLowerCase().includes("private")
      ? "Make sure the video is set to Public on YouTube." :
    error.toLowerCase().includes("caption") || error.toLowerCase().includes("transcript")
      ? "Try a lecture that has captions — most university lectures do." :
    error.toLowerCase().includes("live") || error.toLowerCase().includes("stream")
      ? "Livestreams aren't supported. Try a recorded lecture." :
    error.toLowerCase().includes("short") || error.toLowerCase().includes("2 minute")
      ? "Heidi works best with full lectures, not short clips." :
    error.toLowerCase().includes("url")
      ? "Paste a standard YouTube link — youtube.com/watch?v=..." :
      "Check that the video is public and has captions enabled.";

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-10">
      <div className="flex flex-col items-center gap-5 animate-fade-in-up max-w-sm w-full">
        <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="text-center space-y-2">
          <p className="font-semibold text-[#111827]">Couldn't process this video</p>
          <p className="text-sm text-[#6B7280] leading-relaxed">{error}</p>
          <div className="flex items-start gap-2 text-left bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mt-3">
            <span className="text-base">💡</span>
            <p className="text-xs text-amber-800 leading-relaxed">{hint}</p>
          </div>
        </div>
        <a href="/" className="text-sm font-medium text-[#1a73e8] hover:underline">
          Try a different video →
        </a>
      </div>
    </div>
  );
}

// ── Compact step row ──────────────────────────────────────────────────────────
function StepRow({ label, status }: { label: string; status: AgentStatus }) {
  const isDone    = status === "complete";
  const isRunning = status === "running";

  return (
    <div className="flex items-center gap-2.5">
      {isDone && <CheckCircle className="w-3.5 h-3.5 text-[#1a73e8] flex-shrink-0" />}
      {isRunning && <Loader2 className="w-3.5 h-3.5 text-[#1a73e8] animate-spin flex-shrink-0" />}
      {!isDone && !isRunning && (
        <span className="w-3.5 h-3.5 rounded-full border border-[#D1D5DB] flex-shrink-0" />
      )}
      <span className={
        isDone    ? "text-xs text-[#9CA3AF] line-through" :
        isRunning ? "text-xs font-medium text-[#1a73e8]" :
                    "text-xs text-[#9CA3AF]"
      }>
        {label}
      </span>
      {isRunning && (
        <span className="flex gap-0.5 ml-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-[#1a73e8] animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ProcessingView({ progress, metadata, error }: Props) {
  if (error) return <ErrorView error={error} />;

  // Collapse 3 backend steps into 2 visible steps.
  // "Creating study materials" is active as soon as outline or synthesis starts.
  const step2Status: AgentStatus =
    progress.synthesis === "complete" ? "complete" :
    progress.outline   === "running"  ||
    progress.synthesis === "running"  ? "running" : "idle";

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-10 w-full max-w-sm px-4 animate-fade-in-up">
      <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl shadow-xl p-4">

        {/* Top row: thumbnail + title */}
        <div className="flex items-center gap-3 mb-3">
          {metadata?.thumbnail_url ? (
            <img
              src={metadata.thumbnail_url}
              alt={metadata.title}
              className="w-14 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="relative w-14 h-10 rounded-lg bg-[#e8f0fe] flex-shrink-0 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[#1a73e8]/10 animate-ping-slow rounded-lg" />
              <img src="/logo.png" alt="Heidi" className="w-7 h-7 object-contain relative" style={{ mixBlendMode: "multiply" }} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#111827] truncate">
              {metadata?.title ?? "Connecting to YouTube…"}
            </p>
            {metadata?.author && (
              <p className="text-[10px] text-[#9CA3AF] truncate">{metadata.author}</p>
            )}
          </div>
          {/* Pulse badge */}
          <div className="ml-auto flex-shrink-0 flex items-center gap-1 bg-[#e8f0fe] px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
            <span className="text-[10px] font-medium text-[#1a73e8]">Analyzing</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#F3F4F6] mb-3" />

        {/* 2 steps */}
        <div className="flex flex-col gap-2">
          <StepRow label="Reading transcript"       status={progress.transcript} />
          <StepRow label="Creating study materials" status={step2Status} />
        </div>

        <p className="text-[10px] text-[#9CA3AF] mt-3">Usually ready in 30–60 seconds</p>
      </div>
    </div>
  );
}
