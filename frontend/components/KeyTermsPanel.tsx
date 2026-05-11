"use client";

import { useState } from "react";
import { KeyTerm, secondsToDisplay } from "@/lib/types";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

interface Props {
  keyTerms: KeyTerm[];
}

// Subtle colour per category so the panel has visual rhythm without being loud
const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Algorithm:  { bg: "bg-violet-50",  text: "text-violet-600" },
  Concept:    { bg: "bg-blue-50",    text: "text-blue-600" },
  Formula:    { bg: "bg-amber-50",   text: "text-amber-600" },
  Framework:  { bg: "bg-emerald-50", text: "text-emerald-600" },
  Person:     { bg: "bg-rose-50",    text: "text-rose-600" },
  Tool:       { bg: "bg-cyan-50",    text: "text-cyan-600" },
};

const DEFAULT_COLOR = { bg: "bg-[#e8f0fe]", text: "text-[#1a73e8]" };

function categoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? DEFAULT_COLOR;
}

export default function KeyTermsPanel({ keyTerms }: Props) {
  const { seekTo } = useVideoPlayer();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Unique categories for filter pills
  const categories = Array.from(new Set(keyTerms.map((t) => t.category))).sort();

  const filtered = keyTerms.filter((t) => {
    const matchesSearch =
      !search ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategory || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in space-y-3">
      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter terms…"
        className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg
                   focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                   placeholder:text-[#9CA3AF] text-[#111827] bg-white"
      />

      {/* Category pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              !activeCategory
                ? "bg-[#111827] text-white border-[#111827]"
                : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB]"
            )}
          >
            All
          </button>
          {categories.map((cat) => {
            const { bg, text } = categoryColor(cat);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={clsx(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  activeCategory === cat
                    ? `${bg} ${text} border-current`
                    : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#D1D5DB]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-[#9CA3AF]">
        {filtered.length} {filtered.length === 1 ? "term" : "terms"}
        {activeCategory ? ` · ${activeCategory}` : ""}
      </p>

      {/* Terms list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280] text-center py-6">No terms match your filter.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((term, i) => {
            const { bg, text } = categoryColor(term.category);
            return (
              <div
                key={i}
                className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 space-y-1.5 animate-slide-up"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#111827]">{term.term}</span>
                    <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded-md", bg, text)}>
                      {term.category}
                    </span>
                  </div>
                  <button
                    onClick={() => seekTo(term.timestamp)}
                    className="flex-shrink-0 text-xs font-mono text-[#1a73e8] bg-[#e8f0fe]
                               px-2 py-1 rounded-md hover:bg-[#aecbfa] transition-colors"
                  >
                    {secondsToDisplay(term.timestamp)}
                  </button>
                </div>
                {term.expression && (
                  <div className="my-1 px-3 py-2 bg-amber-50 border border-amber-100 rounded-md">
                    <p className="text-sm font-mono text-amber-800 tracking-wide">{term.expression}</p>
                  </div>
                )}
                <p className="text-xs text-[#374151] leading-relaxed">{term.definition}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
