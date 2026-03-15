'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Building2, AlertTriangle,
  Activity, MessageSquare, BarChart3, LogOut,
  Settings, HelpCircle, ShieldAlert, Truck, Map, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function getNavItems(role: string) {
  const base = [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard }];

  if (role === 'admin' || role === 'ADMIN') return [
    ...base,
    { href: '/dashboard/organizations', label: 'Organizations', icon: Building2 },
    { href: '/dashboard/flood-map', label: 'Flood Map', icon: Map },
    { href: '/dashboard/incidents', label: 'Incidents', icon: ShieldAlert },
    { href: '/dashboard/broadcasts', label: 'Broadcasts', icon: MessageSquare },
    { href: '/dashboard/delivery-reports', label: 'Delivery Reports', icon: BarChart3 },
    { href: '/dashboard/system-health', label: 'System Health', icon: Activity },
  ];

  if (role === 'ngo' || role === 'DISASTER_MANAGER') return [
    ...base,
    { href: '/dashboard/flood-map', label: 'Flood Map', icon: Map },
    { href: '/dashboard/incidents', label: 'Incidents', icon: AlertTriangle },
    { href: '/dashboard/broadcasts', label: 'Broadcasts', icon: MessageSquare },
    { href: '/dashboard/delivery-reports', label: 'Delivery Reports', icon: BarChart3 },
    { href: '/dashboard/sms-templates', label: 'SMS Templates', icon: FileText },
    { href: '/dashboard/distress-signals', label: 'Distress Signals', icon: HelpCircle },
    { href: '/dashboard/response-teams', label: 'Rescue Resources', icon: Truck },
  ];

  return base;
}

const sidebarVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

interface SidebarProps {
  role?: string;
  userId?: string;
  onLogoutAction?: () => void;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ role = '', onLogoutAction, className, onNavigate }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    if (onNavigate) onNavigate();
    if (onLogoutAction) onLogoutAction();
    else router.push('/');
  };

  const navItems = getNavItems(role);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn("w-64 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-800 flex flex-col h-screen flex-shrink-0", className)}
    >
      {/* ── Brand ── */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
            className="flex-shrink-0"
          >
            <img src="/flood-guard-logo.png" alt="FloodGuard Logo" className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-orange-500/20" />
          </motion.div>
          <div>
            <h1 className="font-bold text-white text-lg leading-tight">FloodGuard</h1>
            <p className="text-xs text-slate-500 leading-tight">Disaster Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 mb-2">Navigation</p>
        <motion.div
          variants={sidebarVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0.5"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <motion.div key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-150 text-sm group relative overflow-hidden',
                    isActive
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBg"
                      className="absolute inset-0 bg-orange-500/10 rounded-lg"
                      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                  )}
                  <Icon className={cn(
                    'w-4 h-4 flex-shrink-0 relative z-10 transition-colors',
                    isActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-white'
                  )} />
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavDot"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 relative z-10"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </nav>

      {/* ── Footer ── */}
        <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        <Link href="/dashboard/settings" onClick={onNavigate} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-sm text-slate-400 hover:bg-slate-800/60 hover:text-white group">
          <Settings className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-white" />
          <span>Settings</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-red-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </motion.aside>
  );
}
