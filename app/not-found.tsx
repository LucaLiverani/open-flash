import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">🔍</span>
      <h1 className="text-2xl font-bold mb-2">Page not found</h1>
      <p className="text-text-muted mb-6 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="btn btn-primary"
      >
        Go Home
      </Link>
    </div>
  );
}
