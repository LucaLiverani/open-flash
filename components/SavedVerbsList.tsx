"use client";

import type { SavedVerb } from "@/lib/db";

interface SavedVerbsListProps {
  savedVerbs: SavedVerb[];
  onRemove: (id: string) => void;
}

export default function SavedVerbsList({
  savedVerbs,
  onRemove,
}: SavedVerbsListProps) {
  if (savedVerbs.length === 0) {
    return (
      <p className="text-text-muted text-sm">
        No saved verbs yet. Conjugate a verb and save it for quick access.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {savedVerbs.map((verb) => (
        <div
          key={verb.id}
          className="flex items-center justify-between bg-surface rounded-lg border border-border p-3"
        >
          <div className="flex-1">
            <span className="font-medium">{verb.infinitive}</span>
            <span className="text-text-muted text-sm ml-2">{verb.meaning}</span>
          </div>
          <button
            onClick={() => onRemove(verb.id)}
            className="text-text-muted hover:text-danger text-sm px-2 py-1 rounded transition-colors"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
