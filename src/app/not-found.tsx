import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page not found</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary-light transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
