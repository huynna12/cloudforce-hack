export interface VideoMetadata {
  video_id: string;
  title: string;
  author: string;
  thumbnail_url: string;
  duration: number;
}

export interface OutlineSubPoint {
  text: string;
  timestamp: number;
}

export interface OutlineSection {
  heading: string;
  timestamp: number;
  summary: string;
  sub_points: OutlineSubPoint[];
}

export interface Summaries {
  brief: string;
  medium: string;
  full: string;
}

export interface Flashcard {
  front: string;
  back: string;
  timestamp: number;
  source_text: string;
  expression?: string; // For formula flashcards — the actual notation e.g. "T(n) = 2T(n/2) + Θ(n)"
}

export interface KeyTerm {
  term: string;
  definition: string;
  timestamp: number;
  category: string;
  expression?: string; // For Formula terms — the actual notation e.g. "output = Σ(aᵢ · wᵢ) + b"
}

export interface StudyMaterials {
  outline: OutlineSection[];
  summaries: Summaries;
  flashcards: Flashcard[];
  key_terms: KeyTerm[];
}

export interface SearchResult {
  timestamp: number;
  text: string;
  relevance: string;
}

export type AgentStatus = "idle" | "running" | "complete" | "error";

export interface AgentProgress {
  transcript: AgentStatus;
  outline: AgentStatus;
  synthesis: AgentStatus;
}

export type SummaryDepth = "brief" | "medium" | "full";

export const SUPPORTED_LANGUAGES = [
  "Vietnamese",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Italian",
  "Chinese (Simplified)",
  "Japanese",
  "Korean",
  "Arabic",
  "Hindi",
] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

// ── Faculty audit types ──────────────────────────────────────────────────────

export type AuditRating = "strong" | "good" | "needs_work";
export type AuditCategory = "pedagogical" | "accessibility" | "equity" | "clarity";

export interface AuditIssue {
  priority: number;
  category: AuditCategory;
  timestamp: number;
  issue: string;
  original_text: string;
  suggestion: string;
}

export interface AuditReport {
  overall: Record<AuditCategory, AuditRating>;
  summary: string;
  strengths: string[];
  top_priority: AuditIssue;
  issues: AuditIssue[];
  engagement: {
    strongest_section: { timestamp: number; reason: string };
    weakest_section: { timestamp: number; reason: string };
  };
  first_impression: { rating: AuditRating; feedback: string };
  filler_phrases: { count: number; examples: { phrase: string; timestamp: number }[]; note: string };
}

export function secondsToDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
