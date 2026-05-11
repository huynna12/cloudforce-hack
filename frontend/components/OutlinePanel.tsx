"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { OutlineSection, secondsToDisplay } from "@/lib/types";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

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
                  {section.summary}
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
                  <p className="text-xs text-[#374151] leading-relaxed flex-1">{pt.text}</p>
                  <button
                    onClick={() => seekTo(pt.timestamp)}
                    className={clsx(
                      "flex-shrink-0 text-xs font-mono text-[#6B7280]",
                      "hover:text-[#1a73e8] hover:underline transition-colors"
                    )}
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
