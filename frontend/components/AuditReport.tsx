"use client";

import { useState } from "react";
import { AuditReport, AuditRating, AuditCategory, secondsToDisplay } from "@/lib/types";
import {
  ChevronDown, ChevronRight, AlertTriangle, TrendingUp, TrendingDown,
  Clock, MessageSquare, BookOpen, Eye, Users, AlignLeft, CheckCircle2,
} from "lucide-react";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";
import clsx from "clsx";

// ── Rating config ─────────────────────────────────────────────────────────────

const RATING_CONFIG: Record<AuditRating, {
  bg: string; border: string; text: string; dot: string; emptyDot: string;
  label: string; dots: number;
}> = {
  strong: {
    bg: "bg-emerald-50", border: "border-emerald-200",
    text: "text-emerald-700", dot: "bg-emerald-400", emptyDot: "bg-emerald-100",
    label: "Strong", dots: 3,
  },
  good: {
    bg: "bg-blue-50", border: "border-blue-200",
    text: "text-blue-700", dot: "bg-blue-400", emptyDot: "bg-blue-100",
    label: "Good", dots: 2,
  },
  needs_work: {
    bg: "bg-amber-50", border: "border-amber-200",
    text: "text-amber-700", dot: "bg-amber-400", emptyDot: "bg-amber-100",
    label: "Needs work", dots: 1,
  },
};

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<AuditCategory, {
  Icon: React.ElementType; label: string; iconColor: string;
  badgeBg: string; badgeText: string;
}> = {
  pedagogical:   { Icon: BookOpen,  label: "Pedagogical",   iconColor: "text-violet-400", badgeBg: "bg-violet-50",  badgeText: "text-violet-700" },
  accessibility: { Icon: Eye,       label: "Accessibility", iconColor: "text-blue-400",   badgeBg: "bg-blue-50",    badgeText: "text-blue-700" },
  equity:        { Icon: Users,     label: "Equity",        iconColor: "text-emerald-400",badgeBg: "bg-emerald-50", badgeText: "text-emerald-700" },
  clarity:       { Icon: AlignLeft, label: "Clarity",       iconColor: "text-amber-400",  badgeBg: "bg-amber-50",   badgeText: "text-amber-700" },
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function RatingDots({ rating }: { rating: AuditRating }) {
  const cfg = RATING_CONFIG[rating] ?? RATING_CONFIG.good;
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={clsx("w-2 h-2 rounded-full", i <= cfg.dots ? cfg.dot : cfg.emptyDot)}
        />
      ))}
    </div>
  );
}

function CategoryBadge({ category }: { category: AuditCategory }) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.clarity;
  return (
    <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full", cfg.badgeBg, cfg.badgeText)}>
      {cfg.label}
    </span>
  );
}

function TimestampPill({ seconds }: { seconds: number }) {
  const { seekTo } = useVideoPlayer();
  return (
    <button
      onClick={() => seekTo(seconds)}
      className="inline-flex items-center gap-1 text-xs font-mono text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#aecbfa] px-2 py-0.5 rounded-md transition-colors"
    >
      <Clock className="w-3 h-3" />
      {secondsToDisplay(seconds)}
    </button>
  );
}

// ── Rating badge (simple pill for score rows) ─────────────────────────────────

function RatingBadge({ rating }: { rating: AuditRating }) {
  const r = RATING_CONFIG[rating] ?? RATING_CONFIG.good;
  return (
    <span className={clsx("text-[11px] font-medium px-2 py-0.5 rounded-full", r.bg, r.text)}>
      {r.label}
    </span>
  );
}

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  pedagogical:   "Pedagogical",
  accessibility: "Accessibility",
  equity:        "Equity",
  clarity:       "Clarity",
};

// ── Issue card ────────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  highlight = false,
}: {
  issue: AuditReport["top_priority"];
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(highlight);

  return (
    <div className={clsx(
      "rounded-2xl border overflow-hidden transition-shadow",
      highlight
        ? "border-[#1a73e8] bg-[#e8f0fe]/30 shadow-sm"
        : "border-[#E5E7EB] bg-white hover:shadow-sm"
    )}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((v) => !v)}
        className="flex items-start gap-3 p-4 cursor-pointer"
      >
        <div className="mt-0.5 flex-shrink-0 text-[#9CA3AF]">
          {expanded
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={issue.category as AuditCategory} />
            <TimestampPill seconds={issue.timestamp} />
          </div>
          <p className="text-sm font-medium text-[#111827] leading-snug">{issue.issue}</p>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-black/5 pt-3 animate-fade-in">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1.5">From the lecture</p>
            <blockquote className="border-l-2 border-[#D1D5DB] pl-3 text-xs text-[#6B7280] italic leading-relaxed">
              "{issue.original_text}"
            </blockquote>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF] mb-1.5">Suggested fix</p>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <p className="text-xs text-emerald-800 leading-relaxed">{issue.suggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest">{children}</p>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AuditReportView({ report, videoTitle }: { report: AuditReport; videoTitle: string }) {
  const fillerCount = report.filler_phrases?.count ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Overall scores ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
        <SectionLabel>Overall assessment</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(report.overall) as [AuditCategory, AuditRating][]).map(([cat, rating]) => (
            <div key={cat} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#FAFAFA] rounded-xl">
              <span className="text-xs text-[#374151]">{CATEGORY_LABELS[cat] ?? cat}</span>
              <RatingBadge rating={rating} />
            </div>
          ))}
        </div>
        <p className="text-sm text-[#374151] leading-relaxed pt-1 border-t border-[#F3F4F6]">
          {report.summary}
        </p>
      </div>

      {/* ── Top priority ─────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#e8f0fe] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-3 h-3 text-[#1a73e8]" />
          </div>
          <p className="text-sm font-semibold text-[#111827]">If you change one thing, change this</p>
        </div>
        <IssueCard issue={report.top_priority} highlight />
      </div>

      {/* ── Strengths ────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel>What's working well</SectionLabel>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-4 space-y-2.5">
          {report.strengths.map((s, i) => (
            <div key={i} className="flex gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-900 leading-relaxed">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── All issues ───────────────────────────────────────────────────────── */}
      {report.issues.length > 0 && (
        <div className="space-y-2.5">
          <SectionLabel>Prioritized fixes · {report.issues.length} items</SectionLabel>
          <div className="space-y-2">
            {report.issues.map((issue, i) => (
              <IssueCard key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* ── Engagement ───────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel>Engagement</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold text-[#111827]">Strongest moment</p>
            </div>
            <TimestampPill seconds={report.engagement.strongest_section.timestamp} />
            <p className="text-xs text-[#6B7280] leading-relaxed">{report.engagement.strongest_section.reason}</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center">
                <TrendingDown className="w-3 h-3 text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-[#111827]">Where momentum drops</p>
            </div>
            <TimestampPill seconds={report.engagement.weakest_section.timestamp} />
            <p className="text-xs text-[#6B7280] leading-relaxed">{report.engagement.weakest_section.reason}</p>
          </div>
        </div>
      </div>

      {/* ── First impression ─────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <SectionLabel>First impression · first 3 minutes</SectionLabel>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-2">
          {(() => {
            const rat = RATING_CONFIG[report.first_impression.rating] ?? RATING_CONFIG.good;
            return (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#111827]">Overall hook</p>
                  <div className={clsx("flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium", rat.bg, rat.border, rat.text)}>
                    <RatingDots rating={report.first_impression.rating} />
                    {rat.label}
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] leading-relaxed">{report.first_impression.feedback}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Filler phrases ───────────────────────────────────────────────────── */}
      {fillerCount > 0 && (
        <div className="space-y-2.5">
          <SectionLabel>Filler phrases</SectionLabel>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-[#9CA3AF]" />
                <p className="text-sm font-semibold text-[#111827]">{fillerCount} instances detected</p>
              </div>
            </div>
            {report.filler_phrases.examples.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {report.filler_phrases.examples.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {}}
                    className="inline-flex items-center gap-1.5 text-xs bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] px-2.5 py-1 rounded-full transition-colors"
                  >
                    <span className="italic">"{ex.phrase}"</span>
                    <span className="font-mono text-[10px] text-[#9CA3AF]">{secondsToDisplay(ex.timestamp)}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-[#6B7280] italic leading-relaxed">{report.filler_phrases.note}</p>
          </div>
        </div>
      )}

    </div>
  );
}
