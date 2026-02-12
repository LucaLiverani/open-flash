import Link from "next/link";

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          OpenFlash
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/decks"
            className="text-sm text-text-muted hover:text-text transition-colors"
          >
            Decks
          </Link>
        </div>
      </div>
    </nav>
  );
}
