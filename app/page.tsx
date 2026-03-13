import { Header } from '@/components/landing/header';
import { ArrowRight, Droplets, Map, Users, BarChart3, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'FloodGuard - Real-time Disaster Intelligence Platform',
  description: 'Monitor flood risks, coordinate emergency response, and orchestrate critical SMS alerts in real-time.',
};

export default function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <Header />

      <section className="relative flex min-h-screen items-center pt-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        </div>

        <div className="absolute inset-0 md:hidden">
          <Image
            src="/hero-image.jpg"
            alt="Disaster Intelligence Dashboard"
            fill
            priority
            className="object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-slate-950/80" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-12 md:py-16">
          <div className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
                Real-time <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">disaster intelligence</span>
              </h1>
              <p className="mx-auto max-w-lg text-lg text-slate-300 sm:text-xl md:mx-0">
                Monitor flood risks, coordinate emergency response, and orchestrate critical SMS alerts all in one unified platform.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
              <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-3 font-semibold text-white transition-colors hover:bg-orange-600">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="inline-flex items-center justify-center rounded-full border border-slate-700 px-8 py-3 font-semibold text-white transition-colors hover:border-slate-600">
                Watch Demo
              </button>
            </div>

          </div>

          <div className="relative hidden md:block">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/20 to-blue-500/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-800">
              <Image
                src="/hero-image.jpg"
                alt="Disaster Intelligence Dashboard"
                width={600}
                height={600}
                className="h-auto w-full object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative border-t border-slate-800 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-0 top-1/2 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Complete Disaster Management Suite</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 sm:text-xl">
              Purpose-built for administrators, NGOs, and telecommunications providers
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-8 transition-colors hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20 transition-colors group-hover:bg-orange-500/30">
                <BarChart3 className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">Administrator Control</h3>
              <p className="mb-4 text-slate-400">
                Manage organizations, users, flood zones, and monitor system health with comprehensive analytics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />User Management</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Organization Setup</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />System Monitoring</li>
              </ul>
            </div>

            <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-8 transition-colors hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 transition-colors group-hover:bg-blue-500/30">
                <Map className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">NGO Response Coordination</h3>
              <p className="mb-4 text-slate-400">
                Monitor flood risks in real-time, track distress signals, and coordinate rescue operations.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Flood Map Monitoring</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Distress Signals</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Response Teams</li>
              </ul>
            </div>

            <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-8 transition-colors hover:bg-slate-900/80">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20 transition-colors group-hover:bg-green-500/30">
                <Droplets className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">SMS Alert Orchestration</h3>
              <p className="mb-4 text-slate-400">
                Approve, schedule, and manage critical emergency alerts with comprehensive delivery analytics.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Alert Approvals</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Broadcast Management</li>
                <li className="flex items-center gap-2 text-slate-300"><CheckCircle className="h-4 w-4 text-green-500" />Delivery Analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="relative border-t border-slate-800 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-6 text-3xl font-bold sm:text-4xl">Ready to save lives with FloodGuard?</h2>
          <p className="mb-8 text-lg text-slate-400 sm:text-xl">
            Join organizations worldwide using FloodGuard to protect communities from flood disasters
          </p>
          <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-orange-500 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-orange-600">
            Access Demo Platform
            <ArrowRight className="ml-2 h-6 w-6" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-800 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl text-center text-slate-400">
          <p>&copy; {currentYear} FloodGuard. Protecting Communities from Disaster.</p>
        </div>
      </footer>
    </div>
  );
}
