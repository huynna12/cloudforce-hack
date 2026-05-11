"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Search, Globe } from "lucide-react";
import { startProcessing } from "@/lib/api";

const FEATURES = [
  {
    icon: Layers,
    label: "Structured outline",
    detail: "Jump to any section instantly",
    bg: "bg-[#e8f0fe]",
    fg: "text-[#1a73e8]",
  },
  {
    icon: BookOpen,
    label: "Smart summaries",
    detail: "Quick, core, or deep — you choose",
    bg: "bg-[#ede9fe]",
    fg: "text-[#7c3aed]",
  },
  {
    icon: Search,
    label: "Semantic search",
    detail: "Ask questions, find the moment",
    bg: "bg-[#fce7f3]",
    fg: "text-[#db2777]",
  },
  {
    icon: Globe,
    label: "10+ languages",
    detail: "Study in your native language",
    bg: "bg-[#ccfbf1]",
    fg: "text-[#0f766e]",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const { session_id } = await startProcessing(url.trim());
      router.push(`/study/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">

      {/* ── Background decoration ───────────────────────────────────────────── */}

      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, #9CA3AF 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.22,
        }}
      />

      {/* Soft blue blob — top right */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-[560px] h-[560px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(26,115,232,0.13) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Soft pink blob — bottom left */}
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="relative flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Heidi logo" className="w-10 h-10 object-contain" style={{ mixBlendMode: "multiply" }} />
          <span className="font-semibold text-[#111827] text-lg tracking-tight">Heidi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/faculty"
            className="text-xs px-3 py-1.5 rounded-lg bg-[#fce7f3] border border-[#f9a8d4]
                       text-[#be185d] hover:bg-[#fbcfe8] transition-colors font-medium"
          >
            For instructors
          </Link>
          <span className="text-xs text-[#9CA3AF]">Powered by Cloudforce</span>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl text-center space-y-6 animate-fade-in">

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full
                          border border-[#E5E7EB] bg-white/80 text-[#6B7280] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-pulse" />
            AI-powered · ready in under 60 s
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-4xl font-semibold text-[#111827] leading-tight tracking-tight text-balance">
              Turn any lecture into a{" "}
              <span className="animate-gradient-x">study session</span>
            </h1>
            <p className="mt-3 text-base text-[#6B7280] text-balance">
              Paste a YouTube lecture URL. Get a structured outline, summaries, flashcards,
              and semantic search — ready in under a minute.
            </p>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative group">
              <input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(null); }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3.5 text-sm border border-[#E5E7EB] rounded-xl
                           focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                           bg-white text-[#111827] placeholder:text-[#9CA3AF]
                           shadow-sm hover:shadow-md transition-shadow"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-left animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6
                         bg-[#1a73e8] hover:bg-[#ec4899] text-white text-sm font-medium
                         rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-sm hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting analysis…
                </>
              ) : (
                <>
                  Analyze lecture
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Example */}
          <div>
            <p className="text-xs text-[#9CA3AF] mb-2">Try an example</p>
            <button
              onClick={() => setUrl("https://www.youtube.com/watch?v=aircAruvnKk")}
              className="text-xs text-[#1a73e8] hover:underline"
            >
              3Blue1Brown — But what is a neural network? →
            </button>
          </div>
        </div>

        {/* ── Feature cards ───────────────────────────────────────────────── */}
        <div className="relative mt-16 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 animate-slide-up">
          {FEATURES.map(({ icon: Icon, label, detail, bg, fg }, i) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2.5 p-4 rounded-xl
                         border border-[#F3F4F6] bg-white/80 backdrop-blur-sm
                         hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${fg}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#111827]">{label}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative text-center py-4 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6] bg-white/40">
        Application for The Frontier Internship, powered by Cloudforce.
      </footer>
    </main>
  );
}
