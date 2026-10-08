'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Building2, CreditCard, Gauge, Layers, LogOut, Menu, RefreshCw, Settings, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Avatar, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Overview', icon: Gauge },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/payments', label: 'Payments & bills', icon: CreditCard, badge: true },
  { href: '/plans', label: 'Plans & prices', icon: Layers },
  { href: '/google', label: 'Google', icon: RefreshCw },
  { href: '/settings', label: 'Settings & admins', icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data } = useSWR('/admin/payments?status=pending', { refreshInterval: 60_000 });
  const pending = data?.payments?.length || 0;
  return (
    <div className="flex h-full flex-col bg-ink text-white/80">
      <div className="flex items-center gap-2 px-5 pb-6 pt-6">
        <Link href="/" onClick={onNavigate}><Logo light /></Link>
        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-200">Admin</span>
      </div>
      <nav className="thin-scroll flex-1 overflow-y-auto px-3" aria-label="Admin">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cx('mb-0.5 flex h-10 items-center gap-3 rounded-lg px-3 text-[14.5px] transition-colors', active ? 'bg-white font-medium text-ink' : 'hover:bg-white/[0.07] hover:text-white')}
            >
              <Icon className={cx('h-[18px] w-[18px]', active ? 'text-brand-500' : 'text-white/60')} />
              <span className="flex-1">{item.label}</span>
              {item.badge && pending > 0 && <span className="rounded-full bg-star px-1.5 text-xs font-semibold text-ink">{pending}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
        <Avatar name={user?.name || ''} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-white/60">{user?.email}</p>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen overflow-x-clip lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] lg:block"><Sidebar /></aside>
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line-soft bg-mist/90 px-4 py-3 backdrop-blur lg:hidden">
        <span className="flex items-center gap-2"><Logo /><span className="rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-semibold uppercase text-white">Admin</span></span>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[272px] animate-rise">
            <Sidebar onNavigate={() => setOpen(false)} />
            <button onClick={() => setOpen(false)} className="absolute right-3 top-6 rounded-lg p-1.5 text-white hover:bg-white/10" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1320px] px-4 pb-20 pt-6 sm:px-8 lg:pt-10">{children}</main>
    </div>
  );
}
