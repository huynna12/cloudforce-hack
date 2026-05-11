"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { OutlineSection, secondsToDisplay } from "@/lib/types";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

// Matches [MM:SS] or [H:MM:SS] timestamps embedded in text by the LLM
const TIMESTAMP_RE = /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]/g;

function parseTimestamp(match: string): number {
  const parts = match.slice(1, -1).split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

/** Renders a string, turning any [MM:SS] patterns into clickable blue badge buttons. */
function TextWithTimestamps({
  text,
  seekTo,
}: {
  text: string;
  seekTo: (s: number) => void;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  TIMESTAMP_RE.lastIndex = 0;

  while ((match = TIMESTAMP_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const secs = parseTimestamp(match[0]);
    parts.push(
      <button
        key={match.index}
        onClick={(e) => { e.stopPropagation(); seekTo(secs); }}
        className="inline-block text-[10px] font-mono text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.5 rounded hover:bg-[#aecbfa] transition-colors mx-0.5 align-middle"
      >
        {secondsToDisplay(secs)}
      </button>
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

interface Props {
  outline: OutlineSection[];
}

export default function OutlinePanel({ outline }: Props) {
  const { seekTo } = useVideoPlayer();
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-1 animate-fade-in">
      {outline.map((section, i) => (
        <div key={i} className="rounded-lg border border-[#E5E7EB] overflow-hidden">
          {/* Section header */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggle(i)}
            onKeyDown={(e) => e.key === "Enter" && toggle(i)}
            className="w-full flex items-start gap-3 p-3.5 text-left hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
          >
            <span className="mt-0.5 text-[#6B7280] group-hover:text-[#1a73e8] flex-shrink-0">
              {expanded.has(i) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-[#111827] leading-snug">
                  {section.heading}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(section.timestamp);
                  }}
                  className="flex-shrink-0 text-xs text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-md font-mono hover:bg-[#aecbfa] transition-colors"
                >
                  {secondsToDisplay(section.timestamp)}
                </button>
              </div>
              {expanded.has(i) && (
                <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
                  <TextWithTimestamps text={section.summary} seekTo={seekTo} />
                </p>
              )}
            </div>
          </div>

          {/* Sub-points */}
          {expanded.has(i) && section.sub_points.length > 0 && (
            <div className="border-t border-[#E5E7EB] bg-[#FAFAFA] divide-y divide-[#F3F4F6]">
              {section.sub_points.map((pt, j) => (
                <div
                  key={j}
                  className="flex items-start justify-between gap-3 px-4 py-2.5"
                >
                  <p className="text-xs text-[#374151] leading-relaxed flex-1">
                    <TextWithTimestamps text={pt.text} seekTo={seekTo} />
                  </p>
                  <button
                    onClick={() => seekTo(pt.timestamp)}
                    className="flex-shrink-0 text-xs font-mono text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-md hover:bg-[#aecbfa] transition-colors"
                  >
                    {secondsToDisplay(pt.timestamp)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
