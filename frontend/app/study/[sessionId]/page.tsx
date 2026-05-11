"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  AgentProgress,
  VideoMetadata,
  StudyMaterials,
  Language,
  OutlineSection,
  Summaries,
  Flashcard,
  KeyTerm,
} from "@/lib/types";
import { createEventSource, translateContent, startFacultyProcessing } from "@/lib/api";
import { VideoPlayerProvider } from "@/contexts/VideoPlayerContext";
import VideoPlayer from "@/components/VideoPlayer";
import ProcessingView from "@/components/ProcessingView";
import FleeingParticles from "@/components/FleeingParticles";
import OutlinePanel from "@/components/OutlinePanel";
import SummaryPanel from "@/components/SummaryPanel";
import FlashcardsPanel from "@/components/FlashcardsPanel";
import KeyTermsPanel from "@/components/KeyTermsPanel";
import SearchPanel from "@/components/SearchPanel";
import TutorPanel from "@/components/TutorPanel";
import LanguageSelector from "@/components/LanguageSelector";
import clsx from "clsx";

type Tab = "outline" | "summary" | "flashcards" | "terms" | "search" | "tutor";

const TABS: { key: Tab; label: string }[] = [
  { key: "outline",    label: "Outline" },
  { key: "summary",   label: "Summary" },
  { key: "flashcards", label: "Flashcards" },
  { key: "terms",     label: "Key Terms" },
  { key: "search",    label: "Search" },
  { key: "tutor",     label: "Tutor" },
];

// Search and Tutor need a live backend session — they don't work from cache
const REQUIRES_SESSION: Tab[] = ["search", "tutor"];

export default function StudyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [auditLoading, setAuditLoading] = useState(false);

  const [progress, setProgress] = useState<AgentProgress>({
    transcript: "idle",
    outline: "idle",
    synthesis: "idle",
  });
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("outline");
  const [language, setLanguage] = useState<Language | null>(null);
  const [translatedContent, setTranslatedContent] = useState<{
    outline?: OutlineSection[];
    summaries?: Summaries;
    flashcards?: Flashcard[];
    key_terms?: KeyTerm[];
  }>({});
  const [translating, setTranslating] = useState(false);

  // ── SSE connection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    const CACHE_KEY = `heidi-session-${sessionId}`;
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { metadata: cachedMeta, study_materials } = JSON.parse(cached);
        setMetadata(cachedMeta);
        setStudyMaterials(study_materials);
        setIsComplete(true);
        setFromCache(true);
        return;
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    const es = createEventSource(sessionId);

    es.onmessage = (e) => {
      const event = JSON.parse(e.data);

      if (event.type === "progress") {
        setProgress((prev) => ({ ...prev, [event.agent]: event.status }));
        if (event.agent === "transcript" && event.status === "complete" && event.data) {
          setMetadata(event.data);
        }
      } else if (event.type === "complete") {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(event.data));
        } catch {}
        setMetadata(event.data.metadata);
        setStudyMaterials(event.data.study_materials);
        setIsComplete(true);
        es.close();
      } else if (event.type === "error") {
        setError(event.error);
        es.close();
      }
    };

    es.onerror = () => {
      setError((prev) => (isComplete ? prev : "Connection lost. Please try again."));
      es.close();
    };

    return () => es.close();
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Translation ─────────────────────────────────────────────────────────────
  const handleLanguageChange = useCallback(
    async (lang: Language | null) => {
      setLanguage(lang);
      setTranslatedContent({});
      if (!lang || !studyMaterials || !sessionId) return;

      setTranslating(true);
      try {
        const [outline, summaries, flashcards, key_terms] = await Promise.allSettled([
          translateContent(sessionId, lang, "outline"),
          translateContent(sessionId, lang, "summaries"),
          translateContent(sessionId, lang, "flashcards"),
          translateContent(sessionId, lang, "key_terms"),
        ]);

        setTranslatedContent({
          outline:    outline.status    === "fulfilled" ? outline.value.content    as OutlineSection[] : undefined,
          summaries:  summaries.status  === "fulfilled" ? summaries.value.content  as Summaries        : undefined,
          flashcards: flashcards.status === "fulfilled" ? flashcards.value.content as Flashcard[]      : undefined,
          key_terms:  key_terms.status  === "fulfilled" ? key_terms.value.content  as KeyTerm[]        : undefined,
        });
      } catch {
        // silently fall back to English
      } finally {
        setTranslating(false);
      }
    },
    [studyMaterials, sessionId]
  );

  // ── Derived content ─────────────────────────────────────────────────────────
  const displayOutline    = language && translatedContent.outline    ? translatedContent.outline    : studyMaterials?.outline    ?? [];
  const displaySummaries  = language && translatedContent.summaries  ? translatedContent.summaries  : studyMaterials?.summaries  ?? { brief: "", medium: "", full: "" };
  const displayFlashcards = language && translatedContent.flashcards ? translatedContent.flashcards : studyMaterials?.flashcards ?? [];
  const displayKeyTerms   = language && translatedContent.key_terms  ? translatedContent.key_terms  : studyMaterials?.key_terms  ?? [];

  // ── Faculty audit shortcut ──────────────────────────────────────────────────
  const handleAudit = useCallback(async () => {
    if (!metadata || auditLoading) return;
    setAuditLoading(true);
    try {
      const youtubeUrl = `https://www.youtube.com/watch?v=${metadata.video_id}`;
      const { session_id } = await startFacultyProcessing(youtubeUrl);
      router.push(`/faculty/report/${session_id}`);
    } catch {
      setAuditLoading(false);
    }
  }, [metadata, auditLoading, router]);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!isComplete) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] px-4 relative">
        <FleeingParticles />
        <div className="max-w-lg mx-auto relative" style={{ zIndex: 1 }}>
          <div className="py-4">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
          </div>
          <ProcessingView progress={progress} metadata={metadata} error={error} />
        </div>
      </div>
    );
  }

  if (!studyMaterials || !metadata) return null;

  // ── Study environment ───────────────────────────────────────────────────────
  return (
    <VideoPlayerProvider>
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#111827] transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">New lecture</span>
          </Link>

          <div className="flex-1 min-w-0 text-center">
            <p className="text-sm font-medium text-[#111827] truncate">{metadata.title}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {translating && <span className="text-xs text-[#9CA3AF]">Translating…</span>}
            <LanguageSelector value={language} onChange={handleLanguageChange} />
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto px-4 py-4 gap-4">

          {/* Left: video */}
          <div className="w-full lg:w-2/5 lg:sticky lg:top-20 lg:self-start">
            <VideoPlayer metadata={metadata} />

            {/* Faculty audit shortcut — uses the same URL already loaded */}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-[#9CA3AF]">Made this video yourself?</p>
              <button
                onClick={handleAudit}
                disabled={auditLoading}
                className="text-xs text-[#1a73e8] hover:underline disabled:opacity-50 flex items-center gap-1"
              >
                {auditLoading ? (
                  <>
                    <span className="w-3 h-3 border border-[#1a73e8]/30 border-t-[#1a73e8] rounded-full animate-spin" />
                    Starting audit…
                  </>
                ) : (
                  "Get a video audit →"
                )}
              </button>
            </div>
          </div>

          {/* Right: study panels */}
          <div className="flex-1 min-w-0">

            {/* Tabs — scrollable on mobile to prevent squishing */}
            <div className="mb-4 bg-[#F3F4F6] p-1 rounded-lg overflow-x-auto">
              <div className="flex gap-0.5 min-w-max sm:min-w-0">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={clsx(
                      "flex-1 sm:flex-1 py-1.5 px-2.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                      activeTab === tab.key
                        ? "bg-white text-[#111827] shadow-sm"
                        : "text-[#6B7280] hover:text-[#374151]"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cache notice for Search + Tutor */}
            {fromCache && REQUIRES_SESSION.includes(activeTab) && (
              <div className="mb-4 flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg animate-fade-in">
                <p className="text-xs text-amber-700">
                  <strong>Session loaded from cache.</strong> Search and Tutor need a live connection.
                </p>
                <Link
                  href="/"
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-amber-700 font-medium hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reprocess
                </Link>
              </div>
            )}

            {/* Panel content */}
            <div className="animate-fade-in">
              {activeTab === "outline" && <OutlinePanel outline={displayOutline} />}
              {activeTab === "summary" && <SummaryPanel summaries={displaySummaries} />}
              {activeTab === "flashcards" && (
                displayFlashcards.length > 0
                  ? <FlashcardsPanel flashcards={displayFlashcards} />
                  : <p className="text-sm text-[#6B7280] text-center py-10">No flashcards generated for this lecture.</p>
              )}
              {activeTab === "terms" && (
                displayKeyTerms.length > 0
                  ? <KeyTermsPanel keyTerms={displayKeyTerms} />
                  : <p className="text-sm text-[#6B7280] text-center py-10">No key terms found in this lecture.</p>
              )}
              {activeTab === "search" && <SearchPanel sessionId={sessionId} />}
              {activeTab === "tutor"  && <TutorPanel  sessionId={sessionId} />}
            </div>
          </div>
        </div>
      </div>
    </VideoPlayerProvider>
  );
}
