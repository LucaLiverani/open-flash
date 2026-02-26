"use client";

import { useState, useRef, useEffect } from "react";

interface TenseSelectorProps {
  allTenses: string[];
  selectedTenses: string[];
  onChange: (selected: string[]) => void;
}

export default function TenseSelector({
  allTenses,
  selectedTenses,
  onChange,
}: TenseSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggle = (tense: string) => {
    const next = selectedTenses.includes(tense)
      ? selectedTenses.filter((t) => t !== tense)
      : [...selectedTenses, tense];
    onChange(next);
  };

  const selectAll = () => onChange([...allTenses]);
  const selectNone = () => onChange([]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-left flex items-center justify-between gap-2"
      >
        <span className="truncate text-sm">
          {selectedTenses.length === allTenses.length
            ? "All tenses"
            : selectedTenses.length === 0
              ? "No tenses selected"
              : `${selectedTenses.length} of ${allTenses.length} tenses`}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="flex gap-2 p-2 border-b border-border">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:text-primary-dark transition-colors"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Clear
            </button>
          </div>
          {allTenses.map((tense) => (
            <label
              key={tense}
              className="flex items-center gap-2 px-3 py-2 hover:bg-surface-hover cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selectedTenses.includes(tense)}
                onChange={() => toggle(tense)}
                className="accent-primary"
              />
              {tense}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
