'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Badge, Button, PageHeader, Panel, Skeleton } from '@/components/ui';
import { Kpi, RecordPaymentModal } from '@/components/shared';
import { METHOD_LABEL } from '@/lib/billing';
import { cx, monthLabel, rupees, shortDate, timeAgo } from '@/lib/format';

function RevenueBars({ series }: { series: { month: string; revenue: number; signups: number }[] }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  const [hover, setHover] = useState<number | null>(null);
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
        {series.map((s, i) => (
          <div key={s.month} className="group relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)}>
            {hover === i && (
              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-pop">
                {monthLabel(s.month)}: {rupees(s.revenue)} · {s.signups} new
              </div>
            )}
            <div className={cx('w-full rounded-t-md transition-opacity', i === series.length - 1 ? 'bg-brand-200' : 'bg-brand-400', hover != null && hover !== i && 'opacity-50')} style={{ height: `${Math.max(s.revenue ? 3 : 0, (s.revenue / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 text-center text-[10px] text-ink-faint">
        {series.map((s) => <span key={s.month} className="flex-1">{monthLabel(s.month)}</span>)}
      </div>
    </div>
  );
}

export default function AdminOverview() {
  const { data, mutate } = useSWR('/admin/overview', { refreshInterval: 60_000 });
  const [recording, setRecording] = useState(false);

  if (!data) {
    return (
      <>
        <PageHeader title="Overview" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="mt-6 h-72" />
      </>
    );
  }
  const a = data.accounts;
  const m = data.money;
  const g = data.google;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Every business on ReviewRankr, the money coming in, and what needs your attention."
        actions={<Button onClick={() => setRecording(true)} icon={<Plus className="h-4 w-4" />}>Record a payment</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Accounts" value={a.total} sub={<>{a.active} active · {a.trials} on trial · <span className={a.suspended ? 'text-rose' : ''}>{a.suspended} paused</span></>} />
        <Kpi label="Collected this month" value={rupees(m.collectedThisMonth)} sub={`${rupees(m.collectedAllTime)} all time`} tone="good" />
        <Kpi label="Still to collect" value={rupees(m.outstanding)} sub="Open bills, pending and part paid" tone={m.outstanding ? 'warn' : undefined} />
        <Kpi label="Overdue" value={rupees(m.overdue)} sub={`${m.overdueAccounts} account${m.overdueAccounts === 1 ? '' : 's'} past the due date`} tone={m.overdue ? 'bad' : undefined} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Money received, last 12 months">
            <RevenueBars series={data.series} />
          </Panel>

          <Panel title="Recent payments" padded={false} action={<Link href="/payments?tab=all" className="text-sm font-medium text-brand-600 hover:underline">All</Link>}>
            {data.recentPayments.length === 0 ? <p className="px-5 pb-5 pt-2 text-sm text-ink-muted">No payments yet.</p> : (
              <ul className="divide-y divide-line-soft">
                {data.recentPayments.map((p: any) => (
                  <li key={p._id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                    <Link href={`/accounts/${p.business?._id}`} className="min-w-0 flex-1 truncate font-medium hover:text-brand-600">{p.business?.name}</Link>
                    <span className="text-ink-muted">{METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}</span>
                    <span className="w-24 text-right text-ink-muted">{shortDate(p.paidAt)}</span>
                    <span className="w-24 text-right font-semibold tabular">{rupees(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Payments to check" action={<Link href="/payments" className="text-sm font-medium text-brand-600 hover:underline">Open</Link>}>
            {data.pendingPayments.length === 0 ? <p className="-mt-1 text-sm text-ink-muted">Nothing waiting. When a business says “I’ve paid”, it shows up here.</p> : (
              <ul className="-mt-1 space-y-2">
                {data.pendingPayments.map((p: any) => (
                  <li key={p._id}>
                    <Link href="/payments" className="flex items-center gap-3 rounded-lg bg-amber-soft/60 px-3 py-2 text-sm hover:bg-amber-soft">
                      <span className="flex-1 truncate"><span className="font-medium">{p.business?.name}</span> <span className="text-ink-muted">· {p.reference}</span></span>
                      <span className="font-semibold tabular">{rupees(p.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Google connections" action={<Link href="/google" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">Details <ArrowUpRight className="h-3.5 w-3.5" /></Link>}>
            {!g.configured && <p className="-mt-1 mb-3 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">Google sign-in isn’t set up on the server yet. Businesses can only use demo mode.</p>}
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[['Live', g.live, 'good'], ['Demo', g.demo, 'warn'], ['Not connected', g.none, 'neutral'], ['With errors', g.errors, g.errors ? 'bad' : 'neutral']].map(([l, v, t]) => (
                <div key={l as string} className="flex items-center justify-between rounded-lg bg-mist px-3 py-2"><dt className="text-ink-muted">{l}</dt><dd><Badge tone={t as any}>{v as number}</Badge></dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-ink-muted">{data.reviews.toLocaleString('en-IN')} reviews managed across all accounts.</p>
          </Panel>

          <Panel title="New sign-ups" padded={false} action={<Link href="/accounts" className="text-sm font-medium text-brand-600 hover:underline">Accounts</Link>}>
            <ul className="divide-y divide-line-soft">
              {data.recentSignups.map((b: any) => (
                <li key={b._id}>
                  <Link href={`/accounts/${b._id}`} className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-mist">
                    <span className="min-w-0 flex-1 truncate"><span className="font-medium">{b.name}</span> <span className="text-ink-muted">· {b.category}</span></span>
                    {b.account?.status === 'suspended' ? <Badge tone="bad">Paused</Badge> : b.account?.trialEndsAt && new Date(b.account.trialEndsAt) > new Date() ? <Badge tone="info">Trial</Badge> : null}
                    <span className="text-xs text-ink-muted">{timeAgo(b.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <RecordPaymentModal open={recording} onClose={() => setRecording(false)} onDone={() => mutate()} />
    </>
  );
}
