"use client";

interface SpeakButtonProps {
  onClick: (e: React.MouseEvent) => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

export default function SpeakButton({
  onClick,
  isSpeaking,
  isSupported,
}: SpeakButtonProps) {
  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-full text-text-muted hover:text-primary hover:bg-primary/10 transition-colors ${
        isSpeaking ? "animate-pulse text-primary" : ""
      }`}
      aria-label="Listen to pronunciation"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        {isSpeaking ? (
          <>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        ) : (
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        )}
      </svg>
    </button>
  );
}
