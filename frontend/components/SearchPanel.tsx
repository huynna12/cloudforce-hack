"use client";

import { useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { SearchResult, secondsToDisplay } from "@/lib/types";
import { searchLecture } from "@/lib/api";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";

interface Props {
  sessionId: string;
}

export default function SearchPanel({ sessionId }: Props) {
  const { seekTo } = useVideoPlayer();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await searchLecture(sessionId, query.trim());
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="animate-fade-in space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this lecture…"
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent
                     placeholder:text-[#9CA3AF] text-[#111827] transition-shadow"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a73e8] animate-spin" />
        )}
      </form>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <div className="text-center py-8">
          <p className="text-sm text-[#9CA3AF]">
            Type any question and find the exact moment in the lecture that answers it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {[
              "What is the main argument?",
              "How does this work?",
              "What are the key steps?",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  setTimeout(() => handleSearch(), 0);
                }}
                className="text-xs text-[#1a73e8] bg-[#e8f0fe] px-3 py-1.5 rounded-full hover:bg-[#aecbfa] transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {searched && results.length === 0 && !loading && (
        <p className="text-sm text-[#6B7280] text-center py-4">
          No relevant moments found for that query.
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, i) => (
            <div
              key={i}
              className="rounded-lg border border-[#E5E7EB] bg-white p-3.5 space-y-2 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-[#1a73e8] leading-relaxed flex-1">
                  {result.relevance}
                </p>
                <button
                  onClick={() => seekTo(result.timestamp)}
                  className="flex-shrink-0 text-xs font-mono text-[#1a73e8] bg-[#e8f0fe] px-2 py-1 rounded-md hover:bg-[#aecbfa] transition-colors"
                >
                  {secondsToDisplay(result.timestamp)}
                </button>
              </div>
              <p className="text-xs text-[#374151] leading-relaxed border-l-2 border-[#E5E7EB] pl-3 italic">
                &ldquo;{result.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
