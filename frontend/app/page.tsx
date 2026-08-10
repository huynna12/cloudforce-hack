"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Search, Globe, Youtube, Sparkles } from "lucide-react";
import { startProcessing } from "@/lib/api";
import { isTransientError } from "@/lib/errors";

const FEATURES = [
  {
    icon: Layers,
    label: "Structured outline",
    detail: "Timestamped sections — jump to any moment instantly.",
    bg: "bg-[#e8f0fe]",
    fg: "text-[#1a73e8]",
  },
  {
    icon: BookOpen,
    label: "Smart summaries",
    detail: "2-min recap, 5-min digest, or full breakdown — your call.",
    bg: "bg-[#ede9fe]",
    fg: "text-[#7c3aed]",
  },
  {
    icon: Search,
    label: "Semantic search",
    detail: "Ask any question and jump to the exact moment in the video.",
    bg: "bg-[#fce7f3]",
    fg: "text-[#db2777]",
  },
  {
    icon: Globe,
    label: "10+ languages",
    detail: "Translate everything to your native language in one click.",
    bg: "bg-[#ccfbf1]",
    fg: "text-[#0f766e]",
  },
];

function validateYouTubeUrl(url: string): string | null {
  const s = url.trim();
  if (/\/shorts\//.test(s))
    return "YouTube Shorts aren't supported — please paste a full lecture video URL.";
  const patterns = [
    /(?:v=)([0-9A-Za-z_-]{11})/,
    /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /embed\/([0-9A-Za-z_-]{11})/,
    /^([0-9A-Za-z_-]{11})$/,
  ];
  if (patterns.some((p) => p.test(s))) return null; // valid
  if (s.includes("youtube.com") || s.includes("youtu.be"))
    return "Couldn't find a video ID in that URL. Use a standard youtube.com/watch?v=… link.";
  return "That doesn't look like a YouTube URL. Please paste a link from youtube.com or youtu.be.";
}

const MAX_AUTO_RETRIES = 1;  // one hands-free retry on a transient failure
const RETRY_DELAY = 8;       // seconds to wait before the auto-retry (lets YouTube cool off)

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null); // countdown to auto-retry
  const autoRetries = useRef(0);

  const runProcess = useCallback(async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    const validationError = validateYouTubeUrl(trimmed);
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError(null);
    setRetryIn(null);
    try {
      const { session_id } = await startProcessing(trimmed);
      router.push(`/study/${session_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setLoading(false);
      setError(message);
      // Transient (rate-limit / "busy") failures retry themselves once, after a short
      // cooldown, so the user doesn't have to babysit it. Permanent errors do not.
      if (isTransientError(message) && autoRetries.current < MAX_AUTO_RETRIES) {
        autoRetries.current += 1;
        setRetryIn(RETRY_DELAY);
      }
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    autoRetries.current = 0;  // fresh manual attempt — reset the auto-retry budget
    runProcess(url);
  };

  const cancelRetry = () => setRetryIn(null);

  // Drive the auto-retry countdown; fire runProcess when it hits 0.
  useEffect(() => {
    if (retryIn === null) return;
    if (retryIn <= 0) {
      setRetryIn(null);
      runProcess(url);
      return;
    }
    const t = setTimeout(() => setRetryIn((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [retryIn, url, runProcess]);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-[#FAFAFA]">

      {/* ── Background ──────────────────────────────────────────────────────── */}

      {/* Dot grid — slightly lighter so blob colors breathe through */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.55,
        }}
      />

      {/* Blue blob — top right, wide ellipse */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[820px] h-[580px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(59,130,246,0.3) 0%, rgba(26,115,232,0.2) 40%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      {/* Pink blob — bottom left, tall ellipse */}
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[580px] h-[780px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(236,72,153,0.3) 0%, rgba(219,39,119,0.2) 40%, transparent 60%)",
          filter: "blur(80px)",
        }}
      />

      {/* Lavender bridge — center, connects pink and blue with a soft midpoint */}
      <div
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] z-0"
        style={{
          background: "radial-gradient(ellipse, rgba(139,92,246,0.13) 0%, transparent 65%)",
          filter: "blur(72px)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-3
                      border-b border-white/60 bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Heidi"
            className="w-9 h-9 object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
          <span className="font-bold text-[#111827] text-lg tracking-tight">Heidi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/faculty"
            className="text-xs px-3 py-1.5 rounded-lg bg-[#fce7f3] border border-[#f9a8d4]
                       text-[#be185d] hover:bg-[#fbcfe8] transition-colors font-medium"
          >
            For instructors
          </Link>
          <span className="hidden sm:block text-xs text-[#9CA3AF]">Powered by Claude</span>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-10">

        {/* Badge */}
        <div className="animate-fade-in-up inline-flex items-center gap-2 mb-7
                        text-xs font-medium px-3.5 py-1.5 rounded-full
                        border border-[#E5E7EB] bg-white/90 text-[#6B7280] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
          AI-powered lecture companion
        </div>

        {/* Heading */}
        <h1
          className="animate-fade-in-up text-center font-bold tracking-tight text-balance
                     text-[2.6rem] sm:text-6xl leading-[1.08]"
          style={{ animationDelay: "60ms" }}
        >
          <span className="text-[#111827]">Turn any lecture</span>
          <br />
          <span className="animate-gradient-x">into a study session</span>
        </h1>

        {/* ── Search bar ──────────────────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up w-full max-w-lg mt-10 space-y-3"
          style={{ animationDelay: "180ms" }}
        >
          {/* Pill input + button */}
          <div className={`flex items-center gap-2 bg-white rounded-2xl shadow-md px-3 py-2
                           border transition-all duration-200
                           ${error ? "border-red-300 ring-2 ring-red-100" : "border-[#E5E7EB] focus-within:border-[#1a73e8] focus-within:ring-2 focus-within:ring-[#1a73e8]/20 focus-within:shadow-lg"}`}>
            <Youtube className="w-5 h-5 text-[#FF0000] flex-shrink-0 ml-1" />
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); setRetryIn(null); autoRetries.current = 0; }}
              placeholder="Paste a YouTube lecture URL…"
              className="flex-1 py-2 px-2 text-sm bg-transparent focus:outline-none
                         text-[#111827] placeholder:text-[#9CA3AF] min-w-0"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5
                         bg-[#1a73e8] hover:bg-[#ec4899] text-white text-xs font-semibold
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
                  Analyze
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {error && (
            isTransientError(error) ? (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl animate-fade-in">
                <span className="text-sm leading-none mt-0.5">⏳</span>
                <p className="text-xs text-amber-700 leading-relaxed">
                  {error}{" "}
                  {retryIn !== null ? (
                    <>
                      <span className="text-amber-600">Retrying automatically in {retryIn}s…</span>{" "}
                      <button
                        type="button"
                        onClick={cancelRetry}
                        className="underline hover:no-underline text-amber-700 font-medium"
                      >
                        cancel
                      </button>
                    </>
                  ) : (
                    <span className="text-amber-600">Your link is fine — just press Analyze again in a moment.</span>
                  )}
                </p>
              </div>
            ) : (
              <p className="text-xs text-red-500 pl-2 animate-fade-in">{error}</p>
            )
          )}

        </form>

        {/* ── Step hints ────────────────────────────────────────────────── */}
        <div
          className="animate-fade-in-up flex items-center gap-3 mt-8 text-[11px] text-[#9CA3AF]"
          style={{ animationDelay: "240ms" }}
        >
          {["Paste URL", "Claude reads the lecture", "Study materials ready"].map((step, i) => (
            <span key={step} className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full border border-[#E5E7EB] bg-white flex items-center justify-center text-[9px] font-bold text-[#1a73e8]">
                  {i + 1}
                </span>
                {step}
              </span>
              {i < 2 && <span className="text-[#D1D5DB]">→</span>}
            </span>
          ))}
        </div>

        {/* ── Feature cards ──────────────────────────────────────────────── */}
        <div
          className="animate-slide-up w-full max-w-2xl mt-16"
          style={{ animationDelay: "300ms" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FEATURES.map(({ icon: Icon, label, detail, bg, fg }, i) => (
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
    </main>
  );
}
