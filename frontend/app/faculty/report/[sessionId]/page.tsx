"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, Circle } from "lucide-react";
import { VideoMetadata, AuditReport } from "@/lib/types";
import { createFacultyEventSource } from "@/lib/api";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import VideoPlayer from "@/components/VideoPlayer";
import AuditReportView from "@/components/AuditReport";
import FleeingParticles from "@/components/FleeingParticles";
import clsx from "clsx";

type StepStatus = "idle" | "running" | "complete";

interface Progress {
  transcript: StepStatus;
  audit: StepStatus;
}

const STEPS: { key: keyof Progress; label: string; detail: string }[] = [
  { key: "transcript", label: "Fetching transcript",  detail: "Retrieving captions and video metadata" },
  { key: "audit",      label: "Auditing lecture",      detail: "Analyzing pedagogy, accessibility, equity, and clarity" },
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "complete") return <CheckCircle className="w-4 h-4 text-[#1a73e8]" />;
  if (status === "running")  return <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin" />;
  return <Circle className="w-4 h-4 text-[#D1D5DB]" />;
}

export default function FacultyReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [progress, setProgress] = useState<Progress>({ transcript: "idle", audit: "idle" });
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Reload resilience — check localStorage first
    const CACHE_KEY = `heidi-faculty-${sessionId}`;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { metadata: m, report: r } = JSON.parse(cached);
        setMetadata(m);
        setReport(r);
        setIsComplete(true);
        return;
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    const es = createFacultyEventSource(sessionId);

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "progress") {
        setProgress((prev) => ({ ...prev, [event.step]: event.status }));
        if (event.step === "transcript" && event.status === "complete" && event.data) {
          setMetadata(event.data);
        }
      } else if (event.type === "complete") {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(event.data)); } catch {}
        setMetadata(event.data.metadata);
        setReport(event.data.report);
        setIsComplete(true);
        es.close();
      } else if (event.type === "error") {
        setError(event.error);
        es.close();
      }
    };

    es.onerror = () => {
      setError("Connection lost. Please try again.");
      es.close();
    };

    return () => es.close();
  }, [sessionId]);

  // ── Processing state ──────────────────────────────────────────────────────
  if (!isComplete) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] relative">
        <FleeingParticles onIntroDone={() => setIntroComplete(true)} />

        {/* Error — always visible, no intro gate */}
        {error && introComplete && (
          <div className="fixed inset-0 flex items-center justify-center px-4 z-20 animate-fade-in">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xl">⚠️</div>
              <p className="font-medium text-[#111827]">Something went wrong</p>
              <p className="text-sm text-[#6B7280]">{error}</p>
              <Link href="/faculty" className="text-sm text-[#1a73e8] hover:underline">Try a different video</Link>
            </div>
          </div>
        )}

        {/* Top bar: back left, card centered — only shown after intro */}
        {!error && introComplete && (
          <div className="fixed inset-x-0 top-4 z-20 px-4 animate-fade-in">
            <div className="relative flex items-start justify-center">
              <Link
                href="/faculty"
                className="absolute left-0 inline-flex items-center gap-1.5 text-sm
                           text-[#6B7280] hover:text-[#111827] transition-colors
                           bg-white/80 backdrop-blur px-3 py-1.5 rounded-lg border border-[#E5E7EB] shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Link>
              <div className="w-full max-w-sm animate-fade-in-up">
            <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl shadow-xl p-4">
              {/* Thumbnail + title */}
              <div className="flex items-center gap-3 mb-3">
                {metadata?.thumbnail_url ? (
                  <img src={metadata.thumbnail_url} alt={metadata.title}
                    className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="relative w-14 h-10 rounded-lg bg-[#fce7f3] flex-shrink-0 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#ec4899]/10 animate-ping-slow rounded-lg" />
                    <img src="/logo.png" alt="Heidi" className="w-7 h-7 object-contain relative" style={{ mixBlendMode: "multiply" }} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">
                    {metadata?.title ?? "Connecting to YouTube…"}
                  </p>
                  {metadata?.author && <p className="text-[10px] text-[#9CA3AF] truncate">{metadata.author}</p>}
                </div>
                <div className="ml-auto flex-shrink-0 flex items-center gap-1 bg-[#fce7f3] px-2 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899] animate-pulse" />
                  <span className="text-[10px] font-medium text-[#ec4899]">Auditing</span>
                </div>
              </div>

              <div className="border-t border-[#F3F4F6] mb-3" />

              {/* 2 steps */}
              <div className="flex flex-col gap-2">
                {[
                  { label: "Reading transcript", status: progress.transcript },
                  { label: "Auditing lecture",   status: progress.audit },
                ].map(({ label, status }) => {
                  const isDone    = status === "complete";
                  const isRunning = status === "running";
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      {isDone    && <CheckCircle className="w-3.5 h-3.5 text-[#ec4899] flex-shrink-0" />}
                      {isRunning && <Loader2    className="w-3.5 h-3.5 text-[#ec4899] animate-spin flex-shrink-0" />}
                      {!isDone && !isRunning && <span className="w-3.5 h-3.5 rounded-full border border-[#D1D5DB] flex-shrink-0" />}
                      <span className={
                        isDone    ? "text-xs text-[#9CA3AF] line-through" :
                        isRunning ? "text-xs font-medium text-[#ec4899]" :
                                    "text-xs text-[#9CA3AF]"
                      }>{label}</span>
                      {isRunning && (
                        <span className="flex gap-0.5 ml-1">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1 h-1 rounded-full bg-[#ec4899] animate-bounce"
                              style={{ animationDelay: `${i * 150}ms` }} />
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-3">Usually ready in around 60 seconds</p>
            </div>
          </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!report || !metadata) return null;

  // ── Report ────────────────────────────────────────────────────────────────
  return (
    <VideoPlayerProvider>
      <div className="min-h-screen bg-[#FAFAFA] relative overflow-x-hidden">

        {/* Ambient blobs — very faint, don't interfere with readability */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div style={{
            position: "absolute", top: "-80px", right: "-80px",
            width: 480, height: 400,
            borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
            background: "radial-gradient(ellipse, #f9a8d4 0%, #ec4899 50%, transparent 80%)",
            filter: "blur(72px)", opacity: 0.12,
          }} />
          <div style={{
            position: "absolute", bottom: "-60px", left: "-60px",
            width: 420, height: 360,
            borderRadius: "45% 55% 40% 60% / 55% 45% 60% 40%",
            background: "radial-gradient(ellipse, #93c5fd 0%, #3b82f6 50%, transparent 80%)",
            filter: "blur(68px)", opacity: 0.1,
          }} />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between gap-4">
          <Link href="/faculty" className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">New audit</span>
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-medium text-[#111827] truncate">{metadata.title}</p>
            <p className="text-xs text-[#6B7280]">{metadata.author}</p>
          </div>
          <div className="w-20 flex-shrink-0" />
        </header>

        {/* Two-column layout: video left, report right */}
        <div className="relative z-10 flex flex-col lg:flex-row max-w-7xl mx-auto px-4 py-6 gap-6">

          {/* Left: video (sticky so faculty can click timestamps and watch) */}
          <div className="w-full lg:w-2/5 lg:sticky lg:top-20 lg:self-start space-y-3">
            <VideoPlayer metadata={metadata} />
            <div className="px-1">
              <p className="text-xs text-[#6B7280]">
                Click any timestamp in the report to jump to that moment in the lecture.
              </p>
            </div>
          </div>

          {/* Right: report */}
          <div className="flex-1 min-w-0">
            <AuditReportView report={report} videoTitle={metadata.title} />
          </div>
        </div>

        <footer className="text-center py-4 text-[11px] text-[#9CA3AF] border-t border-[#F3F4F6]">
          This report is private and was generated solely for the instructor · Application for The Frontier Internship, powered by Cloudforce.
        </footer>
      </div>
    </VideoPlayerProvider>
  );
}
