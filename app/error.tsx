'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Application Error</p>
        <h1 className="mt-3 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-400">
          The app hit an unexpected problem. You can retry or go back home.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            Back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
