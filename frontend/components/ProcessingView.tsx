"use client";

import { CheckCircle } from "lucide-react";
import { AgentProgress, AgentStatus, VideoMetadata } from "@/lib/types";
import clsx from "clsx";

interface Props {
  progress: AgentProgress;
  metadata: VideoMetadata | null;
  error: string | null;
}

const STEPS: { key: keyof AgentProgress; label: string; detail: string }[] = [
  { key: "transcript", label: "Reading transcript",       detail: "Pulling captions and video metadata" },
  { key: "outline",    label: "Mapping the lecture",      detail: "Building a timestamped structure" },
  { key: "synthesis",  label: "Creating study materials", detail: "Summaries, flashcards, and key terms" },
];

// ── Error view ────────────────────────────────────────────────────────────────
function ErrorView({ error }: { error: string }) {
  const hint =
    error.toLowerCase().includes("private")   ? "Make sure the video is set to Public on YouTube." :
    error.toLowerCase().includes("caption") || error.toLowerCase().includes("transcript")
                                               ? "Try a lecture that has captions — most university lectures do." :
    error.toLowerCase().includes("live") || error.toLowerCase().includes("stream")
                                               ? "Livestreams aren't supported. Try a recorded lecture." :
    error.toLowerCase().includes("short") || error.toLowerCase().includes("2 minute")
                                               ? "Heidi works best with full lectures, not short clips." :
    error.toLowerCase().includes("url")        ? "Paste a standard YouTube link — youtube.com/watch?v=..." :
    "Check that the video is public and has captions enabled.";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 animate-fade-in-up px-4">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-2xl">
        ⚠️
      </div>
      <div className="text-center max-w-sm space-y-2">
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
  );
}

// ── Progress step ─────────────────────────────────────────────────────────────
function Step({
  label, detail, status, isLast,
}: {
  label: string; detail: string; status: AgentStatus; isLast: boolean;
}) {
  const isDone   = status === "complete";
  const isActive = status === "running";
  const isPending = status === "idle";

  return (
    <div className="flex gap-4">
      {/* Left: icon + connecting line */}
      <div className="flex flex-col items-center">
        <div className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500",
          isDone   && "bg-[#1a73e8]",
          isActive && "bg-white border-2 border-[#1a73e8]",
          isPending && "bg-white border-2 border-[#E5E7EB]",
        )}>
          {isDone && <CheckCircle className="w-4 h-4 text-white" />}
          {isActive && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8] animate-pulse" />
          )}
          {isPending && (
            <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
          )}
        </div>
        {!isLast && (
          <div className={clsx(
            "w-0.5 flex-1 mt-1 min-h-[2rem] transition-all duration-700",
            isDone ? "bg-[#1a73e8]" : "bg-[#E5E7EB]"
          )} />
        )}
      </div>

      {/* Right: text */}
      <div className={clsx(
        "pb-6 transition-all duration-500",
        isPending && "opacity-30",
      )}>
        <p className={clsx(
          "text-sm font-semibold leading-tight",
          isDone   && "text-[#6B7280]",
          isActive && "text-[#1a73e8]",
          isPending && "text-[#111827]",
        )}>
          {label}
        </p>
        {isActive && (
          <p className="text-xs text-[#6B7280] mt-1 animate-fade-in-up">
            {detail}
          </p>
        )}
        {isDone && (
          <p className="text-xs text-[#9CA3AF] mt-0.5">Done</p>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ProcessingView({ progress, metadata, error }: Props) {
  if (error) return <ErrorView error={error} />;

  const allDone = Object.values(progress).every(s => s === "complete");

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">

      {/* ── Hero area ── */}
      <div className="flex flex-col items-center gap-6 mb-10 w-full max-w-sm animate-fade-in-up">

        {/* Thumbnail OR pulsing logo */}
        {metadata?.thumbnail_url ? (
          <div className="relative w-full animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Thumbnail */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-video w-full">
              <img
                src={metadata.thumbnail_url}
                alt={metadata.title}
                className="w-full h-full object-cover"
              />
              {/* Subtle dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              {/* Title on thumbnail */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white text-sm font-semibold leading-snug line-clamp-2">
                  {metadata.title}
                </p>
                <p className="text-white/70 text-xs mt-0.5">{metadata.author}</p>
              </div>
            </div>

            {/* "Analyzing" badge */}
            {!allDone && (
              <div className="absolute -top-2.5 -right-2.5 flex items-center gap-1.5
                              bg-white border border-[#E5E7EB] rounded-full px-2.5 py-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
                <span className="text-[11px] font-medium text-[#1a73e8]">Analyzing</span>
              </div>
            )}
          </div>
        ) : (
          /* Pulsing logo while waiting for metadata */
          <div className="relative flex items-center justify-center w-24 h-24">
            {/* Pulse rings */}
            <div className="absolute inset-0 rounded-full bg-[#1a73e8]/10 animate-ping-slow" />
            <div className="absolute inset-0 rounded-full bg-[#1a73e8]/6 animate-ping-slower" />
            {/* Logo */}
            <div className="relative w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Heidi"
                className="w-14 h-14 object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
          </div>
        )}

        {/* Status text when no thumbnail yet */}
        {!metadata && (
          <p className="text-sm text-[#6B7280] animate-pulse">
            Connecting to YouTube…
          </p>
        )}
      </div>

      {/* ── Steps timeline ── */}
      <div
        className="w-full max-w-xs animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        {STEPS.map((step, i) => (
          <Step
            key={step.key}
            label={step.label}
            detail={step.detail}
            status={progress[step.key]}
            isLast={i === STEPS.length - 1}
          />
        ))}
      </div>

      {/* ── Footer hint ── */}
      <p
        className="text-xs text-[#9CA3AF] mt-2 animate-fade-in-up"
        style={{ animationDelay: "0.4s" }}
      >
        Usually ready in 30–60 seconds
      </p>
    </div>
  );
}
