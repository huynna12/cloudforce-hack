"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, X } from "lucide-react";
import { SUPPORTED_LANGUAGES, Language } from "@/lib/types";
import clsx from "clsx";

interface Props {
  value: Language | null;
  onChange: (lang: Language | null) => void;
}

export default function LanguageSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
          value
            ? "bg-[#e8f0fe] border-[#aecbfa] text-[#1a73e8]"
            : "bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
        )}
      >
        <Globe className="w-3.5 h-3.5" />
        <span>{value ?? "English"}</span>
        <ChevronDown className={clsx("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 overflow-hidden animate-fade-in">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={clsx(
              "w-full text-left px-3 py-2 text-xs hover:bg-[#F9FAFB] transition-colors flex items-center justify-between",
              !value ? "text-[#1a73e8] font-medium" : "text-[#374151]"
            )}
          >
            English (default)
            {!value && <X className="w-3 h-3" />}
          </button>
          <div className="border-t border-[#F3F4F6]" />
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => { onChange(lang); setOpen(false); }}
              className={clsx(
                "w-full text-left px-3 py-2 text-xs hover:bg-[#F9FAFB] transition-colors flex items-center justify-between",
                value === lang ? "text-[#1a73e8] font-medium" : "text-[#374151]"
              )}
            >
              {lang}
              {value === lang && <X className="w-3 h-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
