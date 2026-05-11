"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, BarChart2, Lightbulb, Clock, ShieldCheck, Youtube } from "lucide-react";
import { startFacultyProcessing } from "@/lib/api";

const PILLARS = [
  {
    icon: Lightbulb,
    label: "Pedagogical",
    detail: "Objectives, examples, and concept flow.",
    bg: "bg-[#e8f0fe]",
    fg: "text-[#1a73e8]",
  },
  {
    icon: ShieldCheck,
    label: "Accessibility",
    detail: "Jargon, pacing, and visual references.",
    bg: "bg-[#ede9fe]",
    fg: "text-[#7c3aed]",
  },
  {
    icon: BarChart2,
    label: "Equity",
    detail: "Inclusive language and diverse examples.",
    bg: "bg-[#fce7f3]",
    fg: "text-[#db2777]",
  },
  {
    icon: Clock,
    label: "Clarity",
    detail: "Conciseness, transitions, and structure.",
    bg: "bg-[#ccfbf1]",
    fg: "text-[#0f766e]",
  },
];

export default function FacultyPage() {
  const router = useRouter();
  const [url, setUrl]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { session_id } = await startFacultyProcessing(url.trim());
      router.push(`/faculty/report/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-[#FAFAFA]">

      {/* ── Background ──────────────────────────────────────────────────────── */}

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.55,
        }}
      />

      {/* Pink blob — top right, wide ellipse */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[820px] h-[580px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(236,72,153,0.3) 0%, rgba(219,39,119,0.2) 40%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      {/* Blue blob — bottom left, tall ellipse */}
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[580px] h-[780px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(59,130,246,0.3) 0%, rgba(26,115,232,0.2) 40%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      {/* Lavender bridge — center */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(139,92,246,0.13) 0%, transparent 65%)",
          filter: "blur(72px)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4
                      border-b border-white/60 bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Student view
          </Link>
          <span className="text-[#E5E7EB]">|</span>
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Heidi"
              className="w-9 h-9 object-contain"
              style={{ mixBlendMode: "multiply" }}
            />
            <span className="font-bold text-[#111827] text-sm tracking-tight">Heidi · Faculty</span>
          </div>
        </div>
        <span className="hidden sm:block text-xs text-[#9CA3AF]">Powered by Claude</span>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-10">

        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 mb-7
                        text-xs font-medium px-3.5 py-1.5 rounded-full
                        border border-[#f9a8d4] bg-[#fce7f3]/80 text-[#be185d] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#ec4899] animate-pulse" />
          Lecture audit · actionable feedback
        </div>

        {/* Heading */}
        <h1
          className="animate-fade-in-up text-center font-bold tracking-tight text-balance
                     text-[2.6rem] sm:text-6xl leading-[1.08]"
          style={{ animationDelay: "60ms" }}
        >
          <span className="text-[#111827]">Get feedback on</span>
          <br />
          <span className="animate-gradient-x">any video lecture</span>
        </h1>

        {/* Sub */}
        <p
          className="animate-fade-in-up mt-5 text-base sm:text-lg text-[#6B7280] text-center max-w-md text-balance leading-relaxed"
          style={{ animationDelay: "120ms" }}
        >
          Actionable report across pedagogy, accessibility, equity, and clarity — with timestamped suggestions.
        </p>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up w-full max-w-lg mt-10 space-y-3"
          style={{ animationDelay: "180ms" }}
        >
          <div className={`flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2
                           border transition-all duration-200
                           ${error ? "border-red-300 ring-2 ring-red-100" : "border-[#E5E7EB] focus-within:border-[#ec4899] focus-within:ring-2 focus-within:ring-[#ec4899]/20 focus-within:shadow-lg"}`}>
            <Youtube className="w-5 h-5 text-[#FF0000] flex-shrink-0 ml-1" />
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="Paste a YouTube lecture URL…"
              className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none
                         text-[#111827] placeholder:text-[#9CA3AF] min-w-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5
                         bg-[#ec4899] hover:bg-[#1a73e8] text-white text-xs font-semibold
                         rounded-xl transition-all duration-200 disabled:opacity-40
                         disabled:cursor-not-allowed active:scale-95 shadow-sm hover:shadow-md
                         whitespace-nowrap"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="hidden sm:inline">Analyzing…</span>
                </>
              ) : (
                <>
                  Audit
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 pl-2 animate-fade-in">{error}</p>
          )}

          <p className="text-center text-[11px] text-[#9CA3AF]">
            Works for instructors, TAs, and students preparing a presentation.
          </p>
        </form>

        {/* ── Step hints ────────────────────────────────────────────────── */}
        <div
          className="animate-fade-in-up flex items-center gap-3 mt-8 text-[11px] text-[#9CA3AF]"
          style={{ animationDelay: "240ms" }}
        >
          {["Paste URL", "Claude audits the lecture", "Report with suggestions"].map((step, i) => (
            <span key={step} className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#f9a8d4] bg-[#fce7f3] flex items-center justify-center text-[9px] font-bold text-[#ec4899]">
                  {i + 1}
                </span>
                {step}
              </span>
              {i < 2 && <span className="text-[#D1D5DB]">→</span>}
            </span>
          ))}
        </div>

        {/* ── Pillar cards ────────────────────────────────────────────────── */}
        <div
          className="animate-slide-up w-full max-w-2xl mt-16"
          style={{ animationDelay: "300ms" }}
        >
          <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-5">
            Four dimensions of lecture quality
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PILLARS.map(({ icon: Icon, label, detail, bg, fg }, i) => (
              <div
                key={label}
                className="group flex flex-col items-center text-center gap-3 p-5 rounded-2xl
                           border border-white/80 bg-white/70 backdrop-blur-sm
                           hover:shadow-lg hover:-translate-y-1 hover:bg-white
                           transition-all duration-200 cursor-default"
                style={{ animationDelay: `${300 + i * 50}ms` }}
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center
                                 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-5 h-5 ${fg}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#111827]">{label}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-4 text-[11px] text-[#9CA3AF]
                         border-t border-[#F3F4F6] bg-white/40 backdrop-blur-sm">
        Built for The Frontier Internship by Cloudforce · Powered by Claude
      </footer>
    </main>
  );
}
