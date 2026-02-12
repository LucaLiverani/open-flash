"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">😵</span>
      <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
      <p className="text-text-muted mb-6 max-w-md">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="btn btn-primary"
      >
        Try Again
      </button>
    </div>
  );
}
