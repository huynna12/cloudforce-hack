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
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto px-4">
          <div className="py-4">
            <Link href="/faculty" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827]">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
              <p className="font-medium text-[#111827]">Something went wrong</p>
              <p className="text-sm text-[#6B7280]">{error}</p>
              <Link href="/faculty" className="text-sm text-[#1a73e8] hover:underline">Try a different video</Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-fade-in">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4">
                  <img src="/logo.png" alt="Heidi logo" className="w-full h-full object-contain" style={{ mixBlendMode: "multiply" }} />
                </div>
                {metadata ? (
                  <>
                    <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">Auditing</p>
                    <p className="font-semibold text-[#111827] text-balance">{metadata.title}</p>
                    <p className="text-sm text-[#6B7280] mt-0.5">{metadata.author}</p>
                  </>
                ) : (
                  <p className="text-sm text-[#6B7280]">Starting analysis…</p>
                )}
              </div>

              <div className="w-full max-w-sm space-y-3">
                {STEPS.map((step) => {
                  const status = progress[step.key];
                  const isActive = status === "running";
                  const isDone = status === "complete";
                  return (
                    <div
                      key={step.key}
                      className={clsx(
                        "flex items-start gap-3 rounded-lg p-3 transition-all duration-300",
                        isActive && "bg-[#e8f0fe] border border-[#aecbfa]",
                        isDone && "opacity-60",
                        !isActive && !isDone && "opacity-30"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0"><StepIcon status={status} /></div>
                      <div>
                        <p className={clsx("text-sm font-medium", isActive ? "text-[#1a73e8]" : "text-[#111827]")}>
                          {step.label}
                        </p>
                        {isActive && <p className="text-xs text-[#6B7280] mt-0.5">{step.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#9CA3AF]">Audit usually takes 30–60 seconds</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!report || !metadata) return null;

  // ── Report ────────────────────────────────────────────────────────────────
  return (
    <VideoPlayerProvider>
      <div className="min-h-screen bg-[#FAFAFA]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between gap-4">
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
        <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 py-6 gap-6">

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
