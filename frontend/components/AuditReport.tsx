"use client";

import { useState } from "react";
import { AuditReport, AuditRating, AuditCategory, secondsToDisplay } from "@/lib/types";
import { ChevronDown, ChevronRight, AlertTriangle, TrendingUp, TrendingDown, Clock, MessageSquare } from "lucide-react";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

interface Props {
  report: AuditReport;
  videoTitle: string;
}

// ── Rating helpers ───────────────────────────────────────────────────────────

const RATING_STYLES: Record<AuditRating, { bg: string; text: string; label: string }> = {
  strong:     { bg: "bg-emerald-50", text: "text-emerald-700", label: "Strong" },
  good:       { bg: "bg-blue-50",    text: "text-blue-700",    label: "Good" },
  needs_work: { bg: "bg-amber-50",   text: "text-amber-700",   label: "Needs work" },
};

const CATEGORY_STYLES: Record<AuditCategory, { bg: string; text: string }> = {
  pedagogical:   { bg: "bg-violet-50",  text: "text-violet-700" },
  accessibility: { bg: "bg-blue-50",    text: "text-blue-700" },
  equity:        { bg: "bg-emerald-50", text: "text-emerald-700" },
  clarity:       { bg: "bg-amber-50",   text: "text-amber-700" },
};

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  pedagogical: "Pedagogical",
  accessibility: "Accessibility",
  equity: "Equity",
  clarity: "Clarity",
};

function RatingBadge({ rating }: { rating: AuditRating }) {
  const s = RATING_STYLES[rating];
  return (
    <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-full", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: AuditCategory }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize", s.bg, s.text)}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function TimestampPill({ seconds }: { seconds: number }) {
  const { seekTo } = useVideoPlayer();
  return (
    <button
      onClick={() => seekTo(seconds)}
      className="inline-flex items-center gap-1 text-xs font-mono text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-md hover:bg-[#aecbfa] transition-colors"
    >
      <Clock className="w-3 h-3" />
      {secondsToDisplay(seconds)}
    </button>
  );
}

// ── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({ issue, highlight = false }: { issue: AuditReport["top_priority"]; highlight?: boolean }) {
  const [expanded, setExpanded] = useState(highlight);

  return (
    <div className={clsx(
      "rounded-xl border overflow-hidden",
      highlight ? "border-[#1a73e8] bg-[#e8f0fe]/30" : "border-[#E5E7EB] bg-white"
    )}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-black/[0.02] transition-colors"
      >
        <div className="mt-0.5 flex-shrink-0 text-[#6B7280]">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={issue.category as AuditCategory} />
            <TimestampPill seconds={issue.timestamp} />
          </div>
          <p className="text-sm font-medium text-[#111827] leading-snug">{issue.issue}</p>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#E5E7EB] pt-3 animate-fade-in">
          {/* Original text */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">From the lecture</p>
            <blockquote className="border-l-2 border-[#D1D5DB] pl-3 text-xs text-[#6B7280] italic leading-relaxed">
              "{issue.original_text}"
            </blockquote>
          </div>
          {/* Suggestion */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1">Suggested rewrite</p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
              <p className="text-xs text-emerald-800 leading-relaxed">{issue.suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main report ──────────────────────────────────────────────────────────────

export default function AuditReportView({ report, videoTitle }: Props) {
  const fillerCount = report.filler_phrases?.count ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Overall scores */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-3">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Overall assessment</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(report.overall) as [AuditCategory, AuditRating][]).map(([cat, rating]) => (
            <div key={cat} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] rounded-lg">
              <span className="text-xs text-[#374151] capitalize">{CATEGORY_LABELS[cat]}</span>
              <RatingBadge rating={rating} />
            </div>
          ))}
        </div>
        <p className="text-sm text-[#374151] leading-relaxed pt-1 border-t border-[#F3F4F6]">
          {report.summary}
        </p>
      </div>

      {/* #1 Priority — most prominent section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#1a73e8]" />
          <p className="text-sm font-semibold text-[#111827]">If you change one thing, change this</p>
        </div>
        <IssueCard issue={report.top_priority} highlight />
      </div>

      {/* Strengths */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 space-y-2">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">What's working well</p>
        <ul className="space-y-1.5">
          {report.strengths.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-emerald-800 leading-relaxed">
              <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* All issues */}
      {report.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
            Prioritized fixes ({report.issues.length})
          </p>
          <div className="space-y-2">
            {report.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Engagement + First impression */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Strongest section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs font-semibold text-[#111827]">Strongest moment</p>
          </div>
          <TimestampPill seconds={report.engagement.strongest_section.timestamp} />
          <p className="text-xs text-[#6B7280] leading-relaxed">{report.engagement.strongest_section.reason}</p>
        </div>

        {/* Weakest section */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold text-[#111827]">Where momentum drops</p>
          </div>
          <TimestampPill seconds={report.engagement.weakest_section.timestamp} />
          <p className="text-xs text-[#6B7280] leading-relaxed">{report.engagement.weakest_section.reason}</p>
        </div>
      </div>

      {/* First impression */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#111827]">First impression (first 3 min)</p>
          <RatingBadge rating={report.first_impression.rating} />
        </div>
        <p className="text-xs text-[#6B7280] leading-relaxed">{report.first_impression.feedback}</p>
      </div>

      {/* Filler phrases */}
      {fillerCount > 0 && (
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#6B7280]" />
            <p className="text-xs font-semibold text-[#111827]">
              Filler phrases detected
              <span className="ml-2 font-normal text-[#6B7280]">({fillerCount} instances)</span>
            </p>
          </div>
          {report.filler_phrases.examples.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.filler_phrases.examples.map((ex, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-md">
                  "{ex.phrase}"
                  <span className="font-mono text-[10px] text-[#9CA3AF]">{secondsToDisplay(ex.timestamp)}</span>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-[#6B7280] italic leading-relaxed">{report.filler_phrases.note}</p>
        </div>
      )}

    </div>
  );
}
