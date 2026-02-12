import Link from "next/link";

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
}

export default function EmptyState({
  emoji,
  title,
  description,
  ctaText,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-text-muted mb-6 max-w-md">{description}</p>
      {ctaText && ctaHref && (
        <Link
          href={ctaHref}
          className="btn btn-primary"
        >
          {ctaText}
        </Link>
      )}
    </div>
  );
}
