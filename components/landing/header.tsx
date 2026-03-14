'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navItems = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it Works' },
  { href: '#dashboard', label: 'Capabilities' },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <img src="/flood-guard-logo.png" alt="FloodGuard Logo" className="h-10 w-10 rounded-lg object-contain" />
          <span className="text-lg font-bold text-white sm:text-xl">FloodGuard</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-slate-300 transition-colors hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="rounded-full bg-orange-500 px-6 py-2 font-medium text-white transition-colors hover:bg-orange-600">
            Access Platform
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-200 transition-colors hover:bg-slate-800 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="fixed right-0 top-0 z-50 flex h-screen w-[86vw] max-w-sm flex-col border-l border-slate-800 bg-slate-950/98 px-4 pb-6 pt-4 shadow-2xl shadow-black/40 md:hidden"
            >
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <img src="/flood-guard-logo.png" alt="FloodGuard Logo" className="h-10 w-10 rounded-xl object-contain ring-1 ring-white/10" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold tracking-tight text-white">FloodGuard</p>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Disaster Intelligence</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 transition-colors hover:bg-slate-800"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                {navItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-2xl border border-transparent bg-slate-900/60 px-4 py-3.5 text-base font-medium text-slate-100 transition-colors hover:border-slate-800 hover:bg-slate-900 hover:text-white"
                  >
                    {item.label}
                    <span className="text-sm text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  </Link>
                ))}
              </div>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-orange-500 px-6 py-3.5 font-medium text-white transition-colors hover:bg-orange-600"
              >
                Access Platform
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
