'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, Circle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge, Button, PageHeader, Panel, Segmented, Skeleton, useToast } from '@/components/ui';
import { GoogleBadge } from '@/components/shared';
import { api } from '@/lib/api';
import { cx, timeAgo } from '@/lib/format';

function Step({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" />}
      <div className="text-sm leading-relaxed text-ink-soft">{children}</div>
    </li>
  );
}

export default function AdminGoogle() {
  const toast = useToast();
  const { data, mutate } = useSWR('/admin/google');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  if (!data) return <><PageHeader title="Google" /><Skeleton className="h-64" /></>;

  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast('Copied'));
  const sync = async (id: string) => {
    setBusy(id);
    try {
      const r = await api(`/admin/accounts/${id}/google/sync`, { method: 'POST' });
      toast(r.demo ? 'Demo connection — nothing to sync' : `${r.created} new review${r.created === 1 ? '' : 's'} imported`);
      mutate();
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  };
  const rows = data.connections.filter((c: any) => filter === 'all' || (filter === 'error' ? ['error', 'revoked'].includes(c.status) : c.mode === filter));
  const httpsAssets = /^https:\/\//.test(data.publicAssetUrl) && !/localhost/.test(data.publicAssetUrl);

  return (
    <>
      <PageHeader title="Google" subtitle="The Google sign-in that lets businesses connect their Google Business Profile, and the state of every connection." />

      <div className="mb-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel title={<div className="flex items-center gap-3"><h2 className="font-display text-[17px] font-semibold">Server setup</h2>{data.configured ? <Badge tone="good">Ready</Badge> : <Badge tone="warn">Not set up — demo only</Badge>}</div>}>
          <ol className="space-y-3">
            <Step done={data.configured}>Create a project in <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">Google Cloud Console</a> and request <span className="font-medium">Business Profile API access</span> for it (Google reviews requests; it can take a few days).</Step>
            <Step done={data.configured}>Turn on <span className="font-medium">My Business Account Management API</span>, <span className="font-medium">My Business Business Information API</span> and <span className="font-medium">Google My Business API</span>.</Step>
            <Step done={data.configured}>Set up the <span className="font-medium">OAuth consent screen</span> with the scope <code className="rounded bg-mist px-1 text-xs">business.manage</code>.</Step>
            <Step done={data.clientIdSet && data.secretSet}>
              Create an <span className="font-medium">OAuth client ID</span> (Web application) and add this exact redirect URI:
              <span className="mt-1.5 flex items-center gap-2 rounded-lg bg-mist px-3 py-2 font-mono text-xs text-ink">
                <span className="min-w-0 flex-1 break-all">{data.redirectUri}</span>
                <button onClick={() => copy(data.redirectUri)} className="text-ink-faint hover:text-brand-600" aria-label="Copy redirect URI"><Copy className="h-3.5 w-3.5" /></button>
              </span>
            </Step>
            <Step done={data.clientIdSet && data.secretSet}>
              On the server, add <code className="rounded bg-mist px-1 text-xs">GOOGLE_CLIENT_ID</code> {data.clientIdSet ? <Badge tone="good">set</Badge> : <Badge tone="warn">missing</Badge>} and <code className="rounded bg-mist px-1 text-xs">GOOGLE_CLIENT_SECRET</code> {data.secretSet ? <Badge tone="good">set</Badge> : <Badge tone="warn">missing</Badge>} to <code className="rounded bg-mist px-1 text-xs">.env</code>, then run <code className="rounded bg-mist px-1 text-xs">pm2 reload reviewrankr-api --update-env</code>.
            </Step>
            <Step done={httpsAssets}>Photos and posts: Google downloads images from <span className="font-mono text-xs">{data.publicAssetUrl}</span>{httpsAssets ? ' — a public https address, good.' : ' — this must be a public https address (set FRONTEND_URL or PUBLIC_ASSET_URL).'}</Step>
          </ol>
        </Panel>

        <Panel title="How businesses connect">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">
            <li>The owner opens <span className="font-medium">Google profile</span> in their app and taps <span className="font-medium">Continue with Google</span>.</li>
            <li>They sign in with the Google account that manages their Business Profile and allow access.</li>
            <li>They pick their location. Reviews import straight away, then every 15 minutes.</li>
          </ol>
          <p className="mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-ink-muted">To help a business, open it from <Link href="/accounts" className="font-medium text-brand-600 hover:underline">Accounts</Link> and use <span className="font-medium">Open as business</span> — they still have to sign in with their own Google account.</p>
          <p className="mt-3 text-xs text-ink-muted">Until Google approves API access, businesses can use the demo connection to try everything. Nothing is sent to Google in demo mode.</p>
        </Panel>
      </div>

      <Panel padded={false} title={`Connections · ${data.connections.length}`}>
        <div className="px-5 pt-3"><Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'demo', label: 'Demo' }, { value: 'error', label: 'Errors' }]} /></div>
        <div className="thin-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-ink-muted"><tr className="border-y border-line-soft"><th className="px-5 py-2.5 font-medium">Business</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-3 py-2.5 font-medium">Google account</th><th className="px-3 py-2.5 font-medium">Location</th><th className="px-3 py-2.5 font-medium">Last review check</th><th className="px-5 py-2.5" /></tr></thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((c: any) => (
                <tr key={c.business._id}>
                  <td className="px-5 py-3"><Link href={`/accounts/${c.business._id}`} className="font-medium hover:text-brand-600">{c.business.name}</Link>{c.error && <p className="max-w-[320px] truncate text-xs text-rose" title={c.error}>{c.error}</p>}</td>
                  <td className="px-3 py-3"><GoogleBadge google={c} /></td>
                  <td className="px-3 py-3 text-ink-muted">{c.email || '—'}</td>
                  <td className="px-3 py-3">{c.location || '—'}</td>
                  <td className={cx('px-3 py-3', !c.lastSyncAt && 'text-ink-faint')}>{c.lastSyncAt ? timeAgo(c.lastSyncAt) : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {c.mode === 'live' ? <Button size="sm" variant="secondary" loading={busy === c.business._id} onClick={() => sync(c.business._id)} icon={<RefreshCw className="h-3.5 w-3.5" />}>Sync</Button> : <Link href={`/accounts/${c.business._id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">Open<ExternalLink className="h-3 w-3" /></Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No connections here.</p>}
        </div>
      </Panel>
    </>
  );
}
