'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Search, Star } from 'lucide-react';
import { Button, Empty, Field, Input, Modal, PageHeader, Panel, Segmented, Select, Skeleton, useToast } from '@/components/ui';
import { AccessSwitch, GoogleBadge, StateBadge, usePauseAccount } from '@/components/shared';
import { CYCLE_LABEL } from '@/lib/billing';
import { api } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';
import { rupees, shortDate, timeAgo } from '@/lib/format';

const STATES = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trial', label: 'Trial' },
  { value: 'due', label: 'Payment due' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'suspended', label: 'Paused' },
  { value: 'no_plan', label: 'No plan' },
];

function NewAccountModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (id: string) => void }) {
  const toast = useToast();
  const { data: plans } = useSWR(open ? '/admin/plans' : null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (open) {
      setForm({ businessName: '', category: 'Beauty salon', phone: '', city: '', ownerName: '', email: '', password: Math.random().toString(36).slice(2, 10) + 'A1', plan: '', trialDays: '14' });
      setError('');
    }
  }, [open]);
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await api('/admin/accounts', { body: { ...form, plan: form.plan || null, trialDays: Number(form.trialDays || 0) } });
      toast(`${form.businessName} created. Share the email and password with the owner.`);
      onDone(res.business._id);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Add an account" wide footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Create account</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name"><Input value={form.businessName || ''} onChange={(e) => set('businessName', e.target.value)} autoFocus /></Field>
        <Field label="Type"><Select value={form.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Phone"><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} inputMode="tel" /></Field>
        <Field label="City"><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="Owner’s name"><Input value={form.ownerName || ''} onChange={(e) => set('ownerName', e.target.value)} /></Field>
        <Field label="Owner’s email (to sign in)"><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Password" hint="Share it with the owner. They can change it in Settings."><Input value={form.password || ''} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Free trial (days)"><Input type="number" min={0} value={form.trialDays} onChange={(e) => set('trialDays', e.target.value)} /></Field>
        <Field label="Plan" className="sm:col-span-2">
          <Select value={form.plan} onChange={(e) => set('plan', e.target.value)}>
            <option value="">No plan yet</option>
            {(plans?.plans || []).filter((p: any) => p.active).map((p: any) => <option key={p._id} value={p._id}>{p.name} — {rupees(p.price)} / {CYCLE_LABEL[p.billingCycle]}</option>)}
          </Select>
        </Field>
      </div>
      {error && <p className="mt-4 rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p>}
    </Modal>
  );
}

function AccountsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState(params.get('state') || '');
  const [google, setGoogle] = useState(params.get('google') || '');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  const qs = new URLSearchParams({ limit: '200', ...(state ? { state } : {}), ...(google ? { google } : {}), ...(query ? { q: query } : {}) });
  const { data, mutate } = useSWR(`/admin/accounts?${qs}`);
  const pause = usePauseAccount(() => mutate());
  const rows = data?.accounts || [];

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="Every business using ReviewRankr. Flip the switch to pause or resume an account. Open one to manage its plan, bills, payments and Google connection."
        actions={<Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>Add account</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1"><Segmented value={state} onChange={setState} options={STATES} /></div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input className="field h-10 w-56 pl-9" placeholder="Name, email, phone, city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search accounts" />
          </div>
          <Select className="h-10 w-40" value={google} onChange={(e) => setGoogle(e.target.value)} aria-label="Google connection">
            <option value="">Any Google</option>
            <option value="live">Google live</option>
            <option value="demo">Demo</option>
            <option value="none">Not connected</option>
            <option value="error">With errors</option>
          </Select>
        </div>
      </div>

      <Panel padded={false}>
        {!data ? (
          <div className="space-y-2 p-5">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : rows.length === 0 ? (
          <Empty title="No accounts match">Try another filter or search.</Empty>
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs text-ink-muted">
                <tr className="border-b border-line-soft">
                  <th className="px-5 py-3 font-medium">Business</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Plan & price</th>
                  <th className="px-3 py-3 text-right font-medium">Due</th>
                  <th className="px-3 py-3 font-medium">Google</th>
                  <th className="px-3 py-3 font-medium">Reviews</th>
                  <th className="px-3 py-3 font-medium">Owner last seen</th>
                  <th className="px-5 py-3 text-right font-medium">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((a: any) => (
                  <tr key={a._id} onClick={() => router.push(`/accounts/${a._id}`)} className="cursor-pointer hover:bg-mist/70">
                    <td className="px-5 py-3">
                      <p className="font-medium text-ink">{a.name}</p>
                      <p className="text-xs text-ink-muted">{[a.category, a.city].filter(Boolean).join(' · ')}{a.owner?.email ? ` · ${a.owner.email}` : ''}</p>
                    </td>
                    <td className="px-3 py-3"><StateBadge state={a.state} />{a.state === 'trial' && a.account?.trialEndsAt && <p className="mt-1 text-xs text-ink-muted">until {shortDate(a.account.trialEndsAt)}</p>}</td>
                    <td className="px-3 py-3">
                      {a.account?.plan || a.account?.price != null ? (
                        <>
                          <p>{a.account.plan?.name || 'Custom'}</p>
                          <p className="text-xs text-ink-muted">{rupees(a.netPrice)} / {CYCLE_LABEL[a.account.billingCycle || 'monthly']}{a.netPrice < a.price ? ` (was ${rupees(a.price)})` : ''}</p>
                        </>
                      ) : <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular">{a.balance > 0 ? <span className={a.overdue ? 'font-semibold text-rose' : 'font-medium'}>{rupees(a.balance)}</span> : <span className="text-ink-faint">—</span>}</td>
                    <td className="px-3 py-3"><GoogleBadge google={a.google} />{a.google?.location && <p className="mt-1 max-w-[160px] truncate text-xs text-ink-muted">{a.google.location}</p>}</td>
                    <td className="px-3 py-3">{a.reviews.count ? <span className="inline-flex items-center gap-1">{a.reviews.count}{a.reviews.avg > 0 && <span className="inline-flex items-center gap-0.5 text-xs text-ink-muted"><Star className="h-3 w-3 fill-star text-star" />{a.reviews.avg.toFixed(1)}</span>}</span> : <span className="text-ink-faint">0</span>}</td>
                    <td className="px-3 py-3 text-ink-muted">{a.owner?.lastLoginAt ? timeAgo(a.owner.lastLoginAt) : 'never'}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <AccessSwitch active={a.account?.status !== 'suspended'} busy={pause.busy} onChange={(v) => pause.toggle(a._id, a.name, v)} label={`Access for ${a.name}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      {data && <p className="mt-3 text-xs text-ink-muted">{data.total} account{data.total === 1 ? '' : 's'}</p>}
      {pause.modal}
      <NewAccountModal open={adding} onClose={() => setAdding(false)} onDone={(id) => router.push(`/accounts/${id}`)} />
    </>
  );
}

export default function AccountsPage() {
  return <Suspense><AccountsInner /></Suspense>;
}
