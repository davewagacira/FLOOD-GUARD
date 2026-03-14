'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Settings, ChevronDown, Menu } from 'lucide-react';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  ADMIN: 'Administrator',
  ngo: 'Disaster Manager',
  DISASTER_MANAGER: 'Disaster Manager',
  telco: 'Telco Operator',
  TELCO_OPERATOR: 'Telco Operator',
};

const ROLE_COLOR: Record<string, string> = {
  admin: 'text-orange-400',
  ADMIN: 'text-orange-400',
  ngo: 'text-blue-400',
  DISASTER_MANAGER: 'text-blue-400',
  telco: 'text-purple-400',
  TELCO_OPERATOR: 'text-purple-400',
};

function usePageTitle(pathname: string) {
  const map: Record<string, string> = {
    '/dashboard': 'Overview',
    '/dashboard/admin': 'Overview',
    '/dashboard/ngo': 'Overview',
    '/dashboard/telco': 'Overview',
    '/dashboard/subscribers': 'Network Users',
    '/dashboard/organizations': 'Organizations',
    '/dashboard/users': 'Users',
    '/dashboard/flood-zones': 'Flood Zones',
    '/dashboard/incidents': 'Incidents',
    '/dashboard/system-health': 'System Health',
    '/dashboard/flood-map': 'Flood Map',
    '/dashboard/distress-signals': 'Distress Signals',
    '/dashboard/response-teams': 'Rescue Resources',
    '/dashboard/alert-approvals': 'Alert Approvals',
    '/dashboard/broadcasts': 'Broadcasts',
    '/dashboard/delivery-reports': 'Delivery Reports',
    '/dashboard/sms-templates': 'SMS Templates',
    '/dashboard/settings': 'Settings',
  };
  return map[pathname] ?? 'Dashboard';
}

export function DashboardTopbar({
  onLogoutAction,
  onMenuAction,
}: {
  onLogoutAction?: () => void;
  onMenuAction?: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageTitle = usePageTitle(pathname);

  const role = user?.role ?? '';
  const normalizedRole = String(role).toUpperCase();
  const isAdminUser =
    normalizedRole === 'ADMIN' &&
    (user?.email === 'admin@floodguard.ke' || user?.name === 'FloodGuard Admin' || user?.name === 'Admin');
  let fullName = user?.name ?? '';
  if (fullName === 'FloodGuard Admin') fullName = 'Admin';
  if (fullName === 'Safaricom Operator') fullName = 'Safaricom';
  if ((role === 'ngo' || normalizedRole === 'DISASTER_MANAGER') && user?.organizationName) {
    fullName = user.organizationName.includes('Red Cross') ? 'Red Cross' : user.organizationName;
  }

  const initials = fullName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
  const avatarLabel = isAdminUser ? 'FloodGuard' : (user?.organizationName ?? fullName ?? 'User');
  const avatarSrc = isAdminUser ? '/flood-guard-logo.png' : user?.organizationLogoUrl;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    if (onLogoutAction) {
      onLogoutAction();
      return;
    }
    logout();
    router.push('/');
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-4 backdrop-blur-md sm:px-6 lg:px-8"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuAction}
          aria-label="Open navigation menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 transition-colors hover:bg-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0 lg:hidden">
          <p className="truncate text-sm font-semibold text-white">{pageTitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell userId={user?.id} />
        <div className="hidden h-7 w-px bg-slate-700 sm:block" />

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((open) => !open)}
            className="group flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-lg transition-colors hover:bg-slate-800/70"
          >
            <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-orange-500 to-orange-700 shadow-md">
              {avatarSrc ? (
                <img src={avatarSrc} alt={avatarLabel} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs font-bold tracking-wide text-white">{initials}</div>
              )}
            </div>
            <div className="hidden text-left md:block">
              <p className="max-w-[120px] truncate text-sm font-semibold leading-tight text-white">
                {fullName || ROLE_LABEL[role] || 'User'}
              </p>
              <p className={cn('text-xs leading-tight', ROLE_COLOR[role] ?? 'text-slate-400')}>
                {ROLE_LABEL[role] ?? role}
              </p>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition-transform duration-200', dropdownOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40"
              >
                <div className="border-b border-slate-800 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">{fullName || 'User'}</p>
                  <p className="truncate text-xs text-slate-400">{user?.email ?? ''}</p>
                </div>

                <div className="space-y-0.5 p-1.5">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      router.push('/dashboard/settings');
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-slate-800 p-1.5">
                  <button
                    onClick={handleLogoutClick}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
