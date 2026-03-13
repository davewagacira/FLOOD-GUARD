'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { Loader2, LogOut } from 'lucide-react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    logout();
    router.push('/');
  };

  const handleLogoutClick = () => setShowLogoutModal(true);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <div className="hidden w-64 flex-shrink-0 border-r border-slate-800 bg-slate-900 lg:block" />
        <div className="flex-1" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-950">
      <Sidebar role={user?.role} onLogoutAction={handleLogoutClick} className="hidden lg:flex" />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] border-slate-800 bg-slate-950 p-0 sm:max-w-[280px] lg:hidden">
          <Sidebar
            role={user?.role}
            onLogoutAction={handleLogoutClick}
            onNavigate={() => setMobileNavOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardTopbar onLogoutAction={handleLogoutClick} onMenuAction={() => setMobileNavOpen(true)} />

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="relative min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black"
            >
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                  <LogOut className="ml-1 h-5 w-5 text-red-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-white">Sign Out</h2>
                <p className="mb-6 text-sm text-slate-400">Are you sure you want to sign out of your account?</p>

                <div className="flex w-full items-center gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
                    disabled={isLoggingOut}
                    onClick={() => setShowLogoutModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 border-transparent bg-red-500 text-white hover:bg-red-600"
                    disabled={isLoggingOut}
                    onClick={confirmLogout}
                  >
                    {isLoggingOut ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing out...
                      </span>
                    ) : (
                      'Sign Out'
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
