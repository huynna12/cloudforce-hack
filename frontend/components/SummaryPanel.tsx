"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Summaries, SummaryDepth } from "@/lib/types";
import clsx from "clsx";

interface Props {
  summaries: Summaries;
}

const TABS: { key: SummaryDepth; label: string; sublabel: string }[] = [
  { key: "brief",  label: "Quick", sublabel: "90 sec read" },
  { key: "medium", label: "Core",  sublabel: "~5 min read" },
  { key: "full",   label: "Deep",  sublabel: "Full detail" },
];

export default function SummaryPanel({ summaries }: Props) {
  const [active, setActive] = useState<SummaryDepth>("medium");

  return (
    <div className="animate-fade-in">
      {/* Depth selector */}
      <div className="flex gap-1.5 mb-5 p-1 bg-[#F3F4F6] rounded-lg">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={clsx(
              "flex-1 flex flex-col items-center py-1.5 px-2 rounded-md text-xs font-medium transition-all",
              active === tab.key
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6B7280] hover:text-[#374151]"
            )}
          >
            <span>{tab.label}</span>
            <span className={clsx(
              "text-[10px] font-normal mt-0.5",
              active === tab.key ? "text-[#6B7280]" : "text-[#9CA3AF]"
            )}>
              {tab.sublabel}
            </span>
          </button>
        ))}
      </div>

      {/* Markdown content */}
      <div key={active} className="animate-fade-in">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-base font-bold text-[#111827] mt-5 mb-2 pb-1 border-b border-[#E5E7EB]">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-sm font-bold text-[#111827] mt-5 mb-2 pb-1 border-b border-[#E5E7EB]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold text-[#1a73e8] mt-4 mb-1.5">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-[#374151] leading-relaxed mb-3">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-[#111827]">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-[#6B7280]">{children}</em>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 space-y-1 ml-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 space-y-1 ml-1 list-decimal list-inside">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-sm text-[#374151] leading-relaxed flex gap-2">
                <span className="text-[#1a73e8] mt-1.5 flex-shrink-0">•</span>
                <span>{children}</span>
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[#1a73e8] pl-3 my-3 text-sm text-[#6B7280] italic">
                {children}
              </blockquote>
            ),
            // Block code fences — amber math block; code inside inherits, no double-styling
            pre: ({ children }) => (
              <pre className="my-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg overflow-x-auto leading-relaxed whitespace-pre">
                {children}
              </pre>
            ),
            code: ({ node, children, className }) => {
              // Block code sits inside a <pre> — let pre handle visual styling
              const isBlock = !!className || String(children).includes("\n");
              if (isBlock) {
                return (
                  <code className="font-mono text-sm text-amber-900 bg-transparent">
                    {children}
                  </code>
                );
              }
              // Inline code — subtle amber pill
              return (
                <code className="text-xs bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded font-mono">
                  {children}
                </code>
              );
            },
          }}
        >
          {summaries[active]
            // Strip embedded [MM:SS] timestamps — summaries are for reading, not navigation
            .replace(/ ?\[\d{1,2}:\d{2}(?::\d{2})?\]/g, "")
            // Strip leading bullet/dot char that LLM adds inside list items (our li renderer adds its own)
            .replace(/^([ \t]*[-*+]\s+)[•·⁃∙◦▪▸►●]\s*/gm, "$1")
            // Safety net: replace any code-fenced blocks with their plain-text content
            .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, inner) => inner.trim())}
        </ReactMarkdown>
      </div>
    </div>
  );
}
