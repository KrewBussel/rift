"use client";

import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Render a custom trigger instead of the default text trigger */
  renderTrigger?: (selected: SelectOption | undefined) => React.ReactNode;
}

export default function DarkSelect({ value, onChange, options, placeholder = "Select…", disabled, className, renderTrigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  return (
    <div ref={ref} className={`relative ${className ?? ""}`} style={{ userSelect: "none" }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          background: "#0d1117",
          border: `1px solid ${open ? "#388bfd" : "#30363d"}`,
          color: selected ? "#c9d1d9" : "#7d8590",
        }}
      >
        <span className="flex-1 truncate">
          {renderTrigger ? renderTrigger(selected) : (selected?.label ?? placeholder)}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className="flex-shrink-0 transition-transform"
          style={{ color: "#7d8590", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden py-1"
          style={{
            background: "#1c2128",
            border: "1px solid #30363d",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            minWidth: "100%",
          }}
        >
          {placeholder && !options.find((o) => o.value === "") && value === "" && (
            <div className="px-3 py-2 text-sm" style={{ color: "#7d8590" }}>{placeholder}</div>
          )}
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                style={{
                  background: isSelected ? "#2d333b" : "transparent",
                  color: isSelected ? "#e4e6ea" : "#c9d1d9",
                }}
                onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "#272e38"; }}
                onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0" style={{ color: "#388bfd" }}>
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <span className={isSelected ? "" : "ml-4"}>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
