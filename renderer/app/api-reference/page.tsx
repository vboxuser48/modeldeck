import Link from 'next/link';

/**
 * Placeholder API reference page to keep static export navigation routes valid.
 */
export default function ApiReferencePage(): React.JSX.Element {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
      <section className="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h1 className="text-lg font-semibold text-zinc-100">API Reference</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Local API documentation will appear here in a future update. Current endpoints are available through
          the local service bound to 127.0.0.1.
        </p>
        <div className="mt-5">
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-800/70 px-3 py-1.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-700"
          >
            Back to Chat
          </Link>
        </div>
      </section>
    </main>
  );
}
