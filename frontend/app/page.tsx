"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, Layers, Search, Globe } from "lucide-react";
import { startProcessing } from "@/lib/api";

const FEATURES = [
  { icon: Layers, label: "Structured outline", detail: "Jump to any section instantly" },
  { icon: BookOpen, label: "Smart summaries", detail: "Quick, core, or deep — you choose" },
  { icon: Search, label: "Semantic search", detail: "Ask questions, find the moment" },
  { icon: Globe, label: "10+ languages", detail: "Study in your native language" },
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
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
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

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 animate-fade-in">
        <div className="w-full max-w-xl text-center space-y-6">
          <div>
            <h1 className="text-4xl font-semibold text-[#111827] leading-tight tracking-tight text-balance">
              Turn any lecture into a{" "}
              <span className="text-[#1a73e8]">study session</span>
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
                           shadow-sm transition-shadow"
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
                         shadow-sm hover:shadow-md"
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

        {/* Features */}
        <div className="mt-16 w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up">
          {FEATURES.map(({ icon: Icon, label, detail }) => (
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

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6]">
        Application for The Frontier Internship, powered by Cloudforce.
      </footer>
    </main>
  );
}
