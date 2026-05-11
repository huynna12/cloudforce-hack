"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { SearchResult, secondsToDisplay } from "@/lib/types";
import { searchLecture, askTutor } from "@/lib/api";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";

interface Turn {
  question: string;
  answer: string;
  sources: SearchResult[];
}

interface Props {
  sessionId: string;
}

// Matches [MM:SS] and [MM:SS–MM:SS] timestamp patterns in tutor answers
const TS_RE = /\[(\d{1,2}:\d{2})(?:[–\-]\d{1,2}:\d{2})?\]/g;

function parseTs(mmss: string): number {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
}

/** Wrap [MM:SS] patterns in backticks so ReactMarkdown's code renderer can intercept them. */
function prepareAnswer(text: string): string {
  return text.replace(TS_RE, (match) => {
    // extract just the first MM:SS from ranges like [08:38–09:45]
    const inner = match.slice(1, match.indexOf("]"));
    const first = inner.split(/[–\-]/)[0].trim();
    return `\`[${first}]\``;
  });
}

/** Renders the answer with markdown formatting + clickable timestamp badges. */
function Answer({ text, seekTo }: { text: string; seekTo: (s: number) => void }) {
  const processed = prepareAnswer(text);
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p className="text-sm text-[#374151] leading-relaxed mb-2 last:mb-0">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-[#111827]">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="mb-2 space-y-0.5 ml-1">{children}</ul>,
        li: ({ children }) => (
          <li className="text-sm text-[#374151] leading-relaxed flex gap-1.5">
            <span className="text-[#1a73e8] mt-1.5 flex-shrink-0 text-[10px]">•</span>
            <span>{children}</span>
          </li>
        ),
        // Inline code — if it looks like `[MM:SS]` render as a seekable badge, else style normally
        code: ({ children }) => {
          const str = String(children).trim();
          const tsMatch = str.match(/^\[(\d{1,2}:\d{2})\]$/);
          if (tsMatch) {
            const secs = parseTs(tsMatch[1]);
            return (
              <button
                onClick={() => seekTo(secs)}
                className="inline-block font-mono text-[10px] text-[#1a73e8] bg-[#e8f0fe]
                           px-1.5 py-0.5 rounded hover:bg-[#aecbfa] transition-colors mx-0.5 align-middle"
              >
                {secondsToDisplay(secs)}
              </button>
            );
          }
          return (
            <code className="text-xs bg-[#F3F4F6] text-[#374151] px-1 py-0.5 rounded font-mono">
              {children}
            </code>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

const SUGGESTIONS = [
  "What is the main idea of this lecture?",
  "Can you give me an example from the lecture?",
  "What's the most important formula covered?",
];

export default function AskPanel({ sessionId }: Props) {
  const { seekTo } = useVideoPlayer();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError(null);
    setInput("");

    const history = turns.map((t) => ({ question: t.question, answer: t.answer }));

    try {
      const [tutorRes, searchRes] = await Promise.allSettled([
        askTutor(sessionId, question.trim(), history),
        searchLecture(sessionId, question.trim()),
      ]);

      const answer =
        tutorRes.status === "fulfilled" ? tutorRes.value.answer : "Sorry, I couldn't answer that.";
      const sources =
        searchRes.status === "fulfilled" ? searchRes.value.results : [];

      setTurns((prev) => [...prev, { question: question.trim(), answer, sources }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col animate-fade-in" style={{ minHeight: "480px" }}>
      {/* Conversation */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">

        {/* Empty state */}
        {turns.length === 0 && !loading && (
          <div className="flex flex-col items-center text-center pt-4 gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#1a73e8]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">Ask anything about this lecture</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
                Get an explanation grounded in the lecture, plus the exact moments in the video that cover it.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 w-full">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-[#374151] bg-white border border-[#E5E7EB]
                             rounded-lg px-3 py-2.5 hover:border-[#1a73e8] hover:text-[#1a73e8]
                             transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Turns */}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3 animate-slide-up">
            {/* Question */}
            <div className="flex justify-end">
              <div className="bg-[#1a73e8] text-white text-sm rounded-2xl rounded-tr-sm
                              px-3.5 py-2.5 max-w-[85%] leading-relaxed">
                {turn.question}
              </div>
            </div>

            {/* Answer */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[92%]">
              <Answer text={turn.answer} seekTo={seekTo} />

              {/* Source moments */}
              {turn.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-2">
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                    Source moments
                  </p>
                  {turn.sources.map((src, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <button
                        onClick={() => seekTo(src.timestamp)}
                        className="flex-shrink-0 text-[10px] font-mono text-[#1a73e8] bg-[#e8f0fe]
                                   px-1.5 py-0.5 rounded hover:bg-[#aecbfa] transition-colors mt-0.5"
                      >
                        {secondsToDisplay(src.timestamp)}
                      </button>
                      <p className="text-xs text-[#6B7280] italic leading-relaxed line-clamp-2">
                        &ldquo;{src.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-[#9CA3AF] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-xs text-amber-700">
              {error.toLowerCase().includes("session") || error.toLowerCase().includes("not found")
                ? "This session has expired — Ask needs a live connection."
                : error}
            </p>
            {(error.toLowerCase().includes("session") || error.toLowerCase().includes("not found")) && (
              <a href="/" className="text-xs text-amber-700 font-medium underline mt-1 inline-block">
                Reprocess the video →
              </a>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#E5E7EB] pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this lecture… (Enter to send)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none text-sm px-3 py-2.5 border border-[#E5E7EB] rounded-xl
                       focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                       placeholder:text-[#9CA3AF] text-[#111827] bg-white
                       disabled:opacity-50 transition-shadow"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center transition-colors"
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-1.5">
          Answers grounded in this lecture · Click any timestamp to jump to that moment
        </p>
      </div>
    </div>
  );
}
