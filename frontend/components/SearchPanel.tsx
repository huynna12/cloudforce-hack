"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Search } from "lucide-react";
import { SearchResult, secondsToDisplay } from "@/lib/types";
import { searchLecture } from "@/lib/api";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";

interface Turn {
  question: string;
  sources: SearchResult[];
}

interface Props {
  sessionId: string;
}

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

    try {
      const res = await searchLecture(sessionId, question.trim());
      setTurns((prev) => [...prev, { question: question.trim(), sources: res.results }]);
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
      {/* Results */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">

        {/* Empty state */}
        {turns.length === 0 && !loading && (
          <div className="flex flex-col items-center text-center pt-4 gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] flex items-center justify-center">
              <Search className="w-5 h-5 text-[#1a73e8]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">Search this lecture</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
                Type any question and find the exact moments in the video that cover it.
              </p>
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

            {/* Source moments */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[92%]">
              {turn.sources.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] italic">No matching moments found in this lecture.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">
                    {turn.sources.length} moment{turn.sources.length !== 1 ? "s" : ""} found
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
            placeholder="Search this lecture… (Enter to send)"
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
          Click any timestamp to jump to that moment in the video
        </p>
      </div>
    </div>
  );
}
