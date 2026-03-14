'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ROLE_CREDENTIALS = [
  {
    email: 'coordinator@redcross.ke',
    role: 'Disaster Manager',
    desc: 'Flood Monitoring & Response',
  },
  {
    email: 'operator@safaricom.ke',
    role: 'Telco Operator',
    desc: 'SMS Alert Orchestration',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (cred: string) => {
    setEmail(cred);
    setPassword('Pass@123#');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 lg:grid lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:flex">
        <Image
          src="/hero-image.jpg"
          alt="Flood response coordination"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-950/45 to-orange-950/55" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.28),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.24),transparent_34%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <img src="/flood-guard-logo.png" alt="FloodGuard Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-orange-500/20" />
            <div>
              <p className="text-2xl font-bold text-white">FloodGuard</p>
              <p className="text-sm text-slate-300">Disaster Intelligence Platform</p>
            </div>
          </Link>

          <div className="max-w-xl">
            <h1 className="mt-6 text-4xl font-bold leading-tight text-white xl:text-5xl">
              Coordinate flood alerts, telco broadcasts, and response operations from one secure workspace.
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-200/85 xl:text-lg">
              Review high-risk zones, approve alert actions, and monitor delivery intelligence with one unified operational dashboard.
            </p>
          </div>

          <div className="grid max-w-xl grid-cols-3 gap-3">
            {[
              { label: 'Zones Tracked', value: '8 Active' },
              { label: 'Alerting', value: 'SMS Ready' },
              { label: 'Coverage', value: 'Nairobi' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/3 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center lg:text-left">
            <Link href="/" className="inline-block mb-4">
              <div className="flex items-center justify-center gap-3 lg:justify-start">
                <img src="/flood-guard-logo.png" alt="FloodGuard Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-orange-500/20" />
                <span className="text-2xl font-bold text-white">FloodGuard</span>
              </div>
            </Link>
            <p className="mt-2 text-slate-400">Sign in to access the operational dashboard</p>
          </div>

          <Card className="border border-slate-800 bg-slate-900/75 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Sign In</CardTitle>
              <CardDescription className="text-slate-400">
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-white">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-white">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="........"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                    disabled={isLoading}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-10 w-full bg-gradient-to-r from-orange-500 to-orange-600 font-medium text-white hover:from-orange-600 hover:to-orange-700"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="mt-6 border-t border-slate-800 pt-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Quick Access
                </p>
                <div className="space-y-2">
                  {ROLE_CREDENTIALS.map((cred) => (
                    <button
                      key={cred.email}
                      type="button"
                      onClick={() => fillCredentials(cred.email)}
                      className="group w-full rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-left transition-all hover:border-slate-600 hover:bg-slate-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-orange-400">
                            {cred.email}
                          </p>
                          <p className="text-xs text-slate-400">{cred.role} - {cred.desc}</p>
                        </div>
                        <ChevronRight className="ml-2 h-4 w-4 flex-shrink-0 text-slate-500 transition-colors group-hover:text-orange-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-500 lg:text-left">
            <Link href="/" className="text-slate-400 hover:text-slate-300">
              Back to Home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
