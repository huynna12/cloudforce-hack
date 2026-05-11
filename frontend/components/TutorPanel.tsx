"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, GraduationCap } from "lucide-react";
import { secondsToDisplay } from "@/lib/types";
import { askTutor } from "@/lib/api";
import { useVideoPlayer } from "@/contexts/VideoPlayerContext";

interface Message {
  question: string;
  answer: string;
}

interface Props {
  sessionId: string;
}

// Parse [MM:SS] timestamps in tutor answers and make them clickable
function AnswerWithTimestamps({
  text,
  onSeek,
}: {
  text: string;
  onSeek: (seconds: number) => void;
}) {
  const parts = text.split(/(\[\d{1,2}:\d{2}\])/g);

  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d{1,2}):(\d{2})\]$/);
        if (match) {
          const seconds = parseInt(match[1]) * 60 + parseInt(match[2]);
          return (
            <button
              key={i}
              onClick={() => onSeek(seconds)}
              className="inline-flex items-center font-mono text-[11px] text-[#1a73e8]
                         bg-[#e8f0fe] px-1.5 py-0.5 rounded mx-0.5
                         hover:bg-[#aecbfa] transition-colors"
            >
              {secondsToDisplay(seconds)}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

const SUGGESTIONS = [
  "Can you explain the main concept in simpler terms?",
  "What's the most important thing to remember from this lecture?",
  "I'm confused about the part around the middle — can you clarify?",
];

export default function TutorPanel({ sessionId }: Props) {
  const { seekTo } = useVideoPlayer();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (question: string) => {
    if (!question.trim() || loading) return;

    setLoading(true);
    setError(null);

    // Optimistically show the question
    const history = messages.map((m) => ({ question: m.question, answer: m.answer }));

    try {
      const { answer } = await askTutor(sessionId, question.trim(), history);
      setMessages((prev) => [...prev, { question: question.trim(), answer }]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
    <div className="flex flex-col h-full animate-fade-in" style={{ minHeight: "420px" }}>
      {/* Conversation history */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center text-center pt-4 gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#e8f0fe] flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-[#1a73e8]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">Ask your lecture tutor</p>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xs">
                Ask anything about this lecture. Answers are grounded in what was actually said — with timestamps you can verify.
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

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className="space-y-2 animate-slide-up">
            {/* Question bubble */}
            <div className="flex justify-end">
              <div className="bg-[#1a73e8] text-white text-sm rounded-2xl rounded-tr-sm
                              px-3.5 py-2.5 max-w-[85%] leading-relaxed">
                {msg.question}
              </div>
            </div>

            {/* Answer bubble */}
            <div className="flex justify-start">
              <div className="bg-white border border-[#E5E7EB] text-sm rounded-2xl rounded-tl-sm
                              px-3.5 py-2.5 max-w-[90%] leading-relaxed text-[#374151]">
                <AnswerWithTimestamps text={msg.answer} onSeek={seekTo} />
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
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

        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
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
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
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
          Answers are grounded in this lecture only · Click any timestamp to jump to that moment
        </p>
      </div>
    </div>
  );
}
