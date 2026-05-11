"use client";

import { CheckCircle, Loader2, Circle } from "lucide-react";
import { AgentProgress, AgentStatus, VideoMetadata } from "@/lib/types";
import clsx from "clsx";

interface Props {
  progress: AgentProgress;
  metadata: VideoMetadata | null;
  error: string | null;
}

const STEPS: { key: keyof AgentProgress; label: string; detail: string }[] = [
  {
    key: "transcript",
    label: "Fetching transcript",
    detail: "Retrieving captions and video metadata",
  },
  {
    key: "outline",
    label: "Building structure",
    detail: "Mapping sections and key moments",
  },
  {
    key: "synthesis",
    label: "Generating study materials",
    detail: "Writing summaries and flashcards",
  },
];

function StepIcon({ status }: { status: AgentStatus }) {
  if (status === "complete")
    return <CheckCircle className="w-4 h-4 text-[#1a73e8]" />;
  if (status === "running")
    return <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin" />;
  return <Circle className="w-4 h-4 text-[#D1D5DB]" />;
}

export default function ProcessingView({ progress, metadata, error }: Props) {
  if (error) {
    // Pick a helpful hint based on what went wrong
    const hint =
      error.toLowerCase().includes("private") ? "Make sure the video is set to Public on YouTube." :
      error.toLowerCase().includes("caption") || error.toLowerCase().includes("transcript") ? "Try a lecture that has captions — most university lectures do." :
      error.toLowerCase().includes("live") || error.toLowerCase().includes("stream") ? "Livestreams aren't supported. Try a recorded lecture instead." :
      error.toLowerCase().includes("short") || error.toLowerCase().includes("2 minute") ? "Heidi works best with full lectures, not short clips." :
      error.toLowerCase().includes("url") ? "Paste a standard YouTube link — youtube.com/watch?v=..." :
      "Check that the video is public and has captions enabled.";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="text-center max-w-sm space-y-2">
          <p className="font-medium text-[#111827]">Couldn't process this video</p>
          <p className="text-sm text-[#6B7280]">{error}</p>
          <p className="text-xs text-[#9CA3AF] bg-[#F9FAFB] border border-[#F3F4F6] rounded-lg px-3 py-2 mt-2">
            💡 {hint}
          </p>
        </div>
        <a href="/" className="text-sm text-[#1a73e8] hover:underline">
          Try a different video
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in">
      {/* Title area */}
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4">
          <img src="/logo.png" alt="Heidi logo" className="w-full h-full object-contain" style={{ mixBlendMode: "multiply" }} />
        </div>
        {metadata ? (
          <>
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Analyzing</p>
            <p className="font-semibold text-[#111827] text-balance">{metadata.title}</p>
            <p className="text-sm text-[#6B7280] mt-0.5">{metadata.author}</p>
          </>
        ) : (
          <p className="text-sm text-[#6B7280]">Starting analysis…</p>
        )}
      </div>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, i) => {
          const status = progress[step.key];
          const isActive = status === "running";
          const isDone = status === "complete";

          return (
            <div
              key={step.key}
              className={clsx(
                "flex items-start gap-3 rounded-lg p-3 transition-all duration-300",
                isActive && "bg-[#e8f0fe] border border-[#aecbfa]",
                isDone && "opacity-60",
                !isActive && !isDone && "opacity-30"
              )}
            >
              <div className="mt-0.5 flex-shrink-0">
                <StepIcon status={status} />
              </div>
              <div>
                <p
                  className={clsx(
                    "text-sm font-medium",
                    isActive ? "text-[#1a73e8]" : "text-[#111827]"
                  )}
                >
                  {step.label}
                </p>
                {isActive && (
                  <p className="text-xs text-[#6B7280] mt-0.5 animate-fade-in">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[#9CA3AF]">This usually takes 30–60 seconds</p>
    </div>
  );
}
