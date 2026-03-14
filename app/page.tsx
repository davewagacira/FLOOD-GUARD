import { Header } from '@/components/landing/header';
import { ArrowRight, Droplets, Map, BarChart3, CheckCircle, Code } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'FloodGuard - Real-time Disaster Intelligence Platform',
  description: 'Monitor flood risks, coordinate emergency response, and orchestrate critical SMS alerts in real-time.',
};

export default function LandingPage() {
  const currentYear = new Date().getFullYear();
  const navCardClassName = "rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:bg-slate-900/80";

  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <Header />

      <section className="relative flex min-h-[88svh] items-center pt-16 md:min-h-screen md:items-center md:pt-20">
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

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-2 md:gap-12 md:py-16">
          <div className="space-y-8 text-center md:text-left">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight sm:text-5xl md:text-6xl">
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

      <section id="how-it-works" className="relative border-t border-slate-800 py-20 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">How It Works</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 sm:text-xl">
              A fast, coordinated workflow from flood detection to community response.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className={navCardClassName}>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/15 text-sm font-semibold text-orange-300">01</div>
              <h3 className="mb-3 text-xl font-semibold">Detect Risk Early</h3>
              <p className="text-slate-400">
                Flood zones are monitored with live weather snapshots, incident reporting, and operational status signals.
              </p>
            </div>
            <div className={navCardClassName}>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/15 text-sm font-semibold text-blue-300">02</div>
              <h3 className="mb-3 text-xl font-semibold">Coordinate Response</h3>
              <p className="text-slate-400">
                NGOs and responders track affected areas, assign teams, and manage distress activity from one dashboard.
              </p>
            </div>
            <div className={navCardClassName}>
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-green-500/15 text-sm font-semibold text-green-300">03</div>
              <h3 className="mb-3 text-xl font-semibold">Alert Communities</h3>
              <p className="text-slate-400">
                Critical SMS broadcasts are approved, delivered, and monitored with clear reporting across stakeholders.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="relative border-t border-slate-800 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Platform Capabilities</h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400 sm:text-xl">
              Built for decision-makers who need visibility, speed, and coordination during emergencies.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={navCardClassName}>
              <h3 className="mb-3 text-xl font-semibold">Shared Operating Picture</h3>
              <p className="text-slate-400">
                Give admins, NGOs, and telcos one source of truth across response planning, alerts, and field operations.
              </p>
            </div>
            <div className={navCardClassName}>
              <h3 className="mb-3 text-xl font-semibold">Actionable Response Data</h3>
              <p className="text-slate-400">
                Track incidents, subscribers, distress signals, flood map activity, and delivery reports in real time.
              </p>
            </div>
            <div className={navCardClassName}>
              <h3 className="mb-3 text-xl font-semibold">Operational Resilience</h3>
              <p className="text-slate-400">
                Move from isolated tools to a coordinated platform that keeps teams aligned when pressure is highest.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-slate-800 py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/4 top-0 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
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
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center text-slate-400 md:flex-row md:justify-between md:text-left">
          <p>&copy; {currentYear} FloodGuard. All rights reserved.</p>
          <div className="flex items-center justify-center text-slate-400">
            <Code className="mr-2 h-4 w-4 text-red-600" />
            <span className="text-sm font-medium">Developed by</span>
            <a
              href="https://codeverseke.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 cursor-pointer"
            >
              <span className="bg-gradient-to-r from-red-600 to-blue-500 bg-clip-text text-sm font-bold text-transparent transition-colors hover:from-red-500 hover:to-blue-400">
                Syndicate
              </span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
