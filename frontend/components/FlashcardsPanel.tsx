"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Flashcard, secondsToDisplay } from "@/lib/types";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

interface Props {
  flashcards: Flashcard[];
}

export default function FlashcardsPanel({ flashcards }: Props) {
  const { seekTo } = useVideoPlayer();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = flashcards[index];
  const total = flashcards.length;

  const goTo = (i: number) => {
    setIndex(i);
    setFlipped(false);
  };

  return (
    <div className="animate-fade-in flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-[#6B7280]">
        <span>
          {index + 1} of {total}
        </span>
        <div className="flex gap-0.5 max-w-[180px] overflow-x-auto no-scrollbar">
          {flashcards.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={clsx(
                "h-1 flex-shrink-0 rounded-full transition-all",
                i === index ? "w-4 bg-[#1a73e8]" : "w-1.5 bg-[#E5E7EB] hover:bg-[#D1D5DB]"
              )}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "200px",
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-xl border border-[#E5E7EB] bg-white p-6 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#9CA3AF]">
              Question
            </div>
            <p className="text-base font-medium text-[#111827] leading-snug text-center px-2">
              {card.front}
            </p>
            <div className="text-center text-xs text-[#9CA3AF]">Tap to reveal answer</div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl border border-[#1a73e8] bg-[#e8f0fe] p-6 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="text-[10px] font-medium uppercase tracking-wider text-[#1a73e8]">
              Answer
            </div>
            <div className="flex flex-col gap-2 px-2">
              {card.expression && (
                <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-md">
                  <p className="text-sm font-mono text-amber-800 tracking-wide text-center">
                    {card.expression}
                  </p>
                </div>
              )}
              <p className="text-sm text-[#111827] leading-relaxed text-center">
                {card.back}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#6B7280] italic line-clamp-1 max-w-[60%]">
                &ldquo;{card.source_text}&rdquo;
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  seekTo(card.timestamp);
                }}
                className="text-xs font-mono text-[#1a73e8] bg-white px-2 py-1 rounded-md hover:bg-[#aecbfa] transition-colors"
              >
                {secondsToDisplay(card.timestamp)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goTo(Math.max(0, index - 1))}
          disabled={index === 0}
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#1a73e8] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Flip
        </button>

        <button
          onClick={() => goTo(Math.min(total - 1, index + 1))}
          disabled={index === total - 1}
          className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
