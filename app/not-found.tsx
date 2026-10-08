import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <Link href="/" className="font-medium text-brand-600 hover:underline">Back to the overview</Link>
    </div>
  );
}
