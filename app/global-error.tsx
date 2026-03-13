'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-400">Application Error</p>
            <h1 className="mt-3 text-2xl font-bold">The page crashed</h1>
            <p className="mt-3 text-sm text-slate-400">
              An unexpected error occurred while rendering this page.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
