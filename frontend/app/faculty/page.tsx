"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, BarChart2, Lightbulb, Clock, ShieldCheck } from "lucide-react";
import { startFacultyProcessing } from "@/lib/api";

const PILLARS = [
  { icon: Lightbulb,   label: "Pedagogical",   detail: "Objectives, examples, and concept flow" },
  { icon: ShieldCheck, label: "Accessibility",  detail: "Jargon, pacing, and visual references" },
  { icon: BarChart2,   label: "Equity",         detail: "Inclusive language and diverse examples" },
  { icon: Clock,       label: "Clarity",        detail: "Conciseness, transitions, and structure" },
];

export default function FacultyPage() {
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
      const { session_id } = await startFacultyProcessing(url.trim());
      router.push(`/faculty/report/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6] bg-white">
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
            <img src="/logo.png" alt="Heidi logo" className="w-10 h-10 object-contain" style={{ mixBlendMode: "multiply" }} />
            <span className="font-semibold text-[#111827] text-sm tracking-tight">Heidi · Faculty</span>
          </div>
        </div>
        <span className="text-xs text-[#9CA3AF]">Powered by Cloudforce</span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
        <div className="w-full max-w-xl text-center space-y-6">

          <div>
            <h1 className="text-4xl font-semibold text-[#111827] leading-tight tracking-tight text-balance">
              Get feedback on{" "}
              <span className="text-[#1a73e8]">any video lecture</span>
            </h1>
            <p className="mt-3 text-base text-[#6B7280] text-balance">
              Paste any YouTube lecture URL. Get an actionable report across pedagogy,
              accessibility, equity, and clarity — with timestamped rewrites.
              Perfect for instructors, TAs, or students preparing a presentation.
            </p>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(null); }}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-3.5 text-sm border border-[#E5E7EB] rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                         bg-white text-[#111827] placeholder:text-[#9CA3AF] shadow-sm"
              disabled={loading}
            />
            {error && <p className="text-sm text-red-500 text-left animate-fade-in">{error}</p>}
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6
                         bg-[#1a73e8] hover:bg-[#ec4899] text-white text-sm font-medium
                         rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing lecture…
                </>
              ) : (
                <>
                  Audit this video
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pillars */}
        <div className="mt-16 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PILLARS.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-[#F3F4F6] bg-white"
            >
              <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#1a73e8]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#111827]">{label}</p>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-4 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6]">
        Application for The Frontier Internship, powered by Cloudforce.
      </footer>
    </main>
  );
}
