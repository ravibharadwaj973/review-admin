'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ArrowLeft, Check, ExternalLink, KeyRound, LogIn, MessageCircle, Plus, Printer, RefreshCw, Trash2, Unplug, X } from 'lucide-react';
import { Badge, Button, Field, Input, Modal, Panel, Select, Skeleton, Textarea, Toggle, useToast } from '@/components/ui';
import { AccessSwitch, ConfirmPaymentModal, GoogleBadge, InvoiceModal, RecordPaymentModal, StateBadge, toDateInput, usePauseAccount } from '@/components/shared';
import { CYCLE_LABEL, InvoiceStatus, METHOD_LABEL, PaymentStatus } from '@/lib/billing';
import { api } from '@/lib/api';
import { cx, rupees, shortDate, timeAgo } from '@/lib/format';

const ACTION_LABEL: Record<string, string> = {
  'account.created': 'Account created',
  'account.updated': 'Plan or price changed',
  'account.notes': 'Notes updated',
  'account.suspended': 'Account paused',
  'account.reactivated': 'Account turned back on',
  'account.opened_as_owner': 'Opened as business',
  'owner.password_reset': 'Owner password reset',
  'invoice.created': 'Bill created',
  'invoice.updated': 'Bill changed',
  'invoice.deleted': 'Bill deleted',
  'payment.recorded': 'Payment recorded',
  'payment.reported': 'Business reported a payment',
  'payment.confirmed': 'Payment confirmed',
  'payment.rejected': 'Payment rejected',
  'payment.deleted': 'Payment deleted',
  'google.synced': 'Google synced',
  'google.disconnected': 'Google disconnected',
};

function logDetail(l: any) {
  const d = l.details || {};
  if (d.amount) return `${rupees(d.amount)}${d.method ? ` · ${METHOD_LABEL[d.method] || d.method}` : ''}${d.reference ? ` · ${d.reference}` : ''}`;
  if (d.number) return `${d.number}${d.total != null ? ` · ${rupees(d.total)}` : ''}${d.status ? ` · ${d.status}` : ''}`;
  if (d.reason) return d.reason;
  return '';
}

function PlanPanel({ detail, onSaved }: { detail: any; onSaved: () => void }) {
  const toast = useToast();
  const { data: plans } = useSWR('/admin/plans');
  const acc = detail.billing.account || {};
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm({
      plan: acc.plan?._id || '',
      useCustom: acc.price != null,
      price: acc.price != null ? String(acc.price) : '',
      discountType: acc.discountType || 'none',
      discountValue: String(acc.discountValue || 0),
      billingCycle: acc.billingCycle || 'monthly',
      trialEndsAt: toDateInput(acc.trialEndsAt),
      autoInvoice: acc.autoInvoice !== false,
    });
  }, [detail]); // eslint-disable-line react-hooks/exhaustive-deps

  const plan = (plans?.plans || []).find((p: any) => p._id === form.plan);
  const actual = form.useCustom ? Number(form.price || 0) : plan?.price || 0;
  const disc = form.discountType === 'percent' ? (actual * Math.min(100, Number(form.discountValue || 0))) / 100 : form.discountType === 'flat' ? Math.min(actual, Number(form.discountValue || 0)) : 0;

  const save = async () => {
    setBusy(true);
    try {
      await api(`/admin/accounts/${detail.business._id}`, {
        method: 'PATCH',
        body: {
          plan: form.plan || null,
          price: form.useCustom ? Number(form.price || 0) : null,
          discountType: form.discountType,
          discountValue: Number(form.discountValue || 0),
          billingCycle: form.billingCycle,
          trialEndsAt: form.trialEndsAt || null,
          autoInvoice: form.autoInvoice,
        },
      });
      toast('Plan and price saved');
      onSaved();
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Plan & price">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Plan">
          <Select value={form.plan || ''} onChange={(e) => {
            const p = (plans?.plans || []).find((x: any) => x._id === e.target.value);
            setForm({ ...form, plan: e.target.value, billingCycle: p?.billingCycle || form.billingCycle });
          }}>
            <option value="">No plan</option>
            {(plans?.plans || []).map((p: any) => <option key={p._id} value={p._id}>{p.name} — {rupees(p.price)} / {CYCLE_LABEL[p.billingCycle]}{p.active ? '' : ' (off)'}</option>)}
          </Select>
        </Field>
        <Field label="Billed every">
          <Select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
            {Object.entries(CYCLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={!!form.useCustom} onChange={(e) => setForm({ ...form, useCustom: e.target.checked, price: e.target.checked ? String(plan?.price ?? '') : '' })} />Give this account its own price</label>
          {form.useCustom && <Input className="mt-2 sm:w-60" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price per cycle (₹)" aria-label="Custom price" />}
        </div>
        <Field label="Discount">
          <div className="flex gap-2">
            <Select className="w-36" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} aria-label="Discount type">
              <option value="none">None</option>
              <option value="percent">Percent %</option>
              <option value="flat">Flat ₹</option>
            </Select>
            {form.discountType !== 'none' && <Input type="number" min={0} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} aria-label="Discount value" />}
          </div>
        </Field>
        <Field label="Free trial until"><Input type="date" value={form.trialEndsAt || ''} onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })} /></Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-mist px-4 py-3 text-sm">
        <span>Actual price <span className="font-semibold">{rupees(actual)}</span></span>
        <span>Discount <span className="font-semibold text-leaf">−{rupees(disc)}</span></span>
        <span>They pay <span className="font-display text-lg font-semibold">{rupees(actual - disc)}</span> / {CYCLE_LABEL[form.billingCycle]}</span>
      </div>
      <div className="mt-2 border-t border-line-soft">
        <Toggle checked={!!form.autoInvoice} onChange={(v) => setForm({ ...form, autoInvoice: v })} label="Create bills automatically" description="A new bill is made 3 days before each period starts (after the trial)." />
      </div>
      <div className="mt-3 flex justify-end"><Button onClick={save} loading={busy}>Save plan & price</Button></div>
    </Panel>
  );
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, mutate } = useSWR(`/admin/accounts/${id}`);
  const pause = usePauseAccount(() => mutate());
  const [invoiceModal, setInvoiceModal] = useState<{ open: boolean; invoice?: any }>({ open: false });
  const [payModal, setPayModal] = useState<{ open: boolean; invoice?: any }>({ open: false });
  const [confirmPay, setConfirmPay] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [pw, setPw] = useState<string | null>(null);
  const [del, setDel] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  useEffect(() => setNotes(data?.business?.adminNotes || ''), [data?.business?.adminNotes]);

  if (!data) return <div className="space-y-4"><Skeleton className="h-16 w-80" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>;
  const b = data.business;
  const bill = data.billing;
  const g = data.google;
  const s = data.stats;
  const active = bill.account?.status !== 'suspended';
  // WhatsApp payment reminder to the owner's phone (10-digit Indian numbers get +91)
  const digits = String(b.phone || '').replace(/\D/g, '');
  const waNumber = digits.length === 10 ? `91${digits}` : digits;
  const nextBill = bill.invoices.filter((i: any) => ['pending', 'partial'].includes(i.status)).sort((x: any, y: any) => new Date(x.dueDate).getTime() - new Date(y.dueDate).getTime())[0];
  const reminder = nextBill
    ? `Hi ${data.owner?.name?.split(' ')[0] || ''}, a reminder from ${bill.payTo?.companyName || 'ReviewRankr'}: your bill ${nextBill.number} has ${rupees(bill.due)} due${nextBill.dueDate ? ` (due ${shortDate(nextBill.dueDate)})` : ''}.${bill.payTo?.upiId ? ` You can pay by UPI to ${bill.payTo.upiId}.` : ''} Please reply with the payment reference once paid. Thank you!`
    : '';

  const run = async (key: string, fn: () => Promise<any>, ok?: string) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast(ok);
      mutate();
      return r;
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  };
  const openAs = () => {
    // Open the tab straight away (browsers block tabs opened after waiting), then send it to the business app
    const tab = window.open('', '_blank');
    run('imp', async () => {
      const r = await api(`/admin/accounts/${id}/impersonate`, { method: 'POST', body: { returnUrl: window.location.href } });
      if (tab) {
        tab.opener = null;
        tab.location.href = r.url;
      } else {
        window.location.href = r.url;
      }
      return true;
    }).then((ok) => {
      if (!ok) tab?.close(); // the request failed — don't leave an empty tab
    });
  };

  return (
    <>
      <Link href="/accounts" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-brand-600"><ArrowLeft className="h-4 w-4" />Accounts</Link>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[30px] font-semibold leading-tight">{b.name}</h1>
            <StateBadge state={bill.state} />
          </div>
          <p className="mt-1 text-[15px] text-ink-muted">{[b.category, b.address?.city].filter(Boolean).join(' · ')} · joined {shortDate(b.createdAt)}</p>
          {!active && bill.account?.suspendedReason && <p className="mt-1 text-sm text-rose">Paused{bill.account.suspendedBy === 'system' ? ' automatically' : ''}: {bill.account.suspendedReason}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-2 flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium">
            <AccessSwitch active={active} busy={pause.busy} onChange={(v) => pause.toggle(b._id, b.name, v)} />
            {active ? 'Account active' : 'Account paused'}
          </label>
          <Button variant="secondary" onClick={openAs} loading={busy === 'imp'} icon={<LogIn className="h-4 w-4" />}>Open as business</Button>
          {bill.due > 0 && waNumber.length >= 10 && (
            <a href={`https://wa.me/${waNumber}?text=${encodeURIComponent(reminder)}`} target="_blank" rel="noreferrer">
              <Button variant="secondary" icon={<MessageCircle className="h-4 w-4" />}>Payment reminder</Button>
            </a>
          )}
          <Button variant="ghost" onClick={() => setPw('')} icon={<KeyRound className="h-4 w-4" />}>Reset password</Button>
          <Button variant="ghost" className="text-rose" onClick={() => setDel('')} icon={<Trash2 className="h-4 w-4" />} aria-label="Delete account" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {[
          ['Reviews', s.reviews], ['Avg rating', s.avgRating ? s.avgRating.toFixed(1) : '—'], ['Not replied', s.unanswered], ['AI replies sent', s.replies],
          ['Review requests', s.requests], ['Customers', s.customers], ['Photos posted', `${s.photosPosted}/${s.photos}`], ['Google posts', s.posts],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-white px-3 py-2.5 shadow-lift">
            <p className="font-display text-xl font-semibold tabular">{v as any}</p>
            <p className="text-xs text-ink-muted">{l}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              ['Due now', rupees(bill.due), bill.overdueAmount > 0 ? 'text-rose' : bill.due > 0 ? 'text-amber' : ''],
              ['Overdue', rupees(bill.overdueAmount), bill.overdueAmount > 0 ? 'text-rose' : ''],
              ['Total paid', rupees(bill.paidTotal), 'text-leaf'],
              ['Paid until', bill.account?.paidUntil ? shortDate(bill.account.paidUntil) : '—', ''],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl2 border border-line-soft bg-paper px-4 py-3 shadow-lift">
                <p className="text-xs text-ink-muted">{l}</p>
                <p className={cx('mt-1 font-display text-xl font-semibold tabular', c)}>{v}</p>
              </div>
            ))}
          </div>
          {bill.credit > 0 && <p className="-mt-3 text-sm text-leaf">{rupees(bill.credit)} credit — it’s used on the next bill automatically.</p>}

          <PlanPanel detail={data} onSaved={() => mutate()} />

          <Panel
            title="Bills"
            padded={false}
            action={<div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => setPayModal({ open: true })}>Record payment</Button><Button size="sm" onClick={() => setInvoiceModal({ open: true })} icon={<Plus className="h-3.5 w-3.5" />}>New bill</Button></div>}
          >
            {bill.invoices.length === 0 ? <p className="px-5 pb-5 pt-3 text-sm text-ink-muted">No bills yet. Create one, or turn on automatic bills in the plan above.</p> : (
              <div className="thin-scroll mt-3 overflow-x-auto">
                <table className="w-full min-w-[980px] whitespace-nowrap text-sm">
                  <thead className="text-left text-xs text-ink-muted">
                    <tr className="border-y border-line-soft"><th className="px-5 py-2.5 font-medium">Bill</th><th className="px-3 py-2.5 font-medium">For</th><th className="px-3 py-2.5 text-right font-medium">Price</th><th className="px-3 py-2.5 text-right font-medium">Discount</th><th className="px-3 py-2.5 text-right font-medium">Paid</th><th className="px-3 py-2.5 text-right font-medium">Balance</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-3 py-2.5 font-medium">Status</th><th className="px-5 py-2.5" /></tr>
                  </thead>
                  <tbody className="divide-y divide-line-soft">
                    {bill.invoices.map((i: any) => {
                      const open = ['pending', 'partial'].includes(i.status);
                      return (
                        <tr key={i._id}>
                          <td className="px-5 py-3"><span className="font-mono text-xs">{i.number}</span>{i.createdBy === 'system' && <span className="block text-[11px] text-ink-faint">auto</span>}</td>
                          <td className="min-w-[170px] whitespace-normal px-3 py-3">{i.description || i.planName || '—'}{i.periodStart && <span className="block text-xs text-ink-muted">{shortDate(i.periodStart)} – {shortDate(i.periodEnd)}</span>}</td>
                          <td className="px-3 py-3 text-right tabular">{rupees(i.amount)}</td>
                          <td className="px-3 py-3 text-right tabular text-leaf">{i.discount ? `−${rupees(i.discount)}` : '—'}</td>
                          <td className="px-3 py-3 text-right tabular">{rupees(i.paid)}</td>
                          <td className="px-3 py-3 text-right font-semibold tabular">{rupees(i.balance)}</td>
                          <td className="px-3 py-3">{shortDate(i.dueDate)}</td>
                          <td className="px-3 py-3"><InvoiceStatus inv={i} /></td>
                          <td className="whitespace-nowrap px-5 py-3 text-right">
                            {open && <Button size="sm" variant="secondary" onClick={() => setPayModal({ open: true, invoice: i })}>Mark paid</Button>}
                            <Button size="sm" variant="ghost" aria-label={`Print ${i.number}`} title={i.status === 'paid' ? 'Print receipt' : 'Print bill'} onClick={() => window.open(`/print/invoice/${i._id}`, '_blank')} icon={<Printer className="h-3.5 w-3.5" />} />
                            {i.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => setInvoiceModal({ open: true, invoice: i })}>Edit</Button>}
                            {open && <Button size="sm" variant="ghost" onClick={() => window.confirm(`Waive the remaining ${rupees(i.balance)} on ${i.number}?`) && run('w', () => api(`/admin/invoices/${i._id}`, { method: 'PATCH', body: { status: 'waived' } }), 'Bill waived')}>Waive</Button>}
                            {['waived', 'cancelled'].includes(i.status) && <Button size="sm" variant="ghost" onClick={() => run('o', () => api(`/admin/invoices/${i._id}`, { method: 'PATCH', body: { status: 'open' } }), 'Bill reopened')}>Reopen</Button>}
                            {i.paid === 0 && <Button size="sm" variant="ghost" className="text-ink-faint hover:text-rose" aria-label="Delete bill" onClick={() => window.confirm(`Delete ${i.number}?`) && run('d', () => api(`/admin/invoices/${i._id}`, { method: 'DELETE' }), 'Bill deleted')} icon={<Trash2 className="h-3.5 w-3.5" />} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Payments" padded={false}>
            {bill.payments.length === 0 ? <p className="px-5 pb-5 pt-3 text-sm text-ink-muted">No payments yet.</p> : (
              <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
                {bill.payments.map((p: any) => (
                  <li key={p._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                    <span className="w-24 text-ink-muted">{shortDate(p.paidAt)}</span>
                    <span className="w-24 font-semibold tabular">{rupees(p.amount)}</span>
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{METHOD_LABEL[p.method]}{p.reference ? ` · ${p.reference}` : ''}{p.allocations?.length ? <span className="text-ink-muted"> → {p.allocations.map((a: any) => a.invoice?.number).filter(Boolean).join(', ')}</span> : null}{p.submittedBy === 'owner' && <span className="text-ink-muted"> · sent by business</span>}</span>
                    <PaymentStatus p={p} />
                    {p.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => setConfirmPay(p)} icon={<Check className="h-3.5 w-3.5" />}>Confirm</Button>
                        <Button size="sm" variant="ghost" onClick={() => run('rj', () => api(`/admin/payments/${p._id}/reject`, { body: { reason: window.prompt('Why? (optional)') || '' } }), 'Payment rejected')} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
                      </>
                    )}
                    {p.status !== 'pending' && <Button size="sm" variant="ghost" className="text-ink-faint hover:text-rose" aria-label="Delete payment" onClick={() => window.confirm(`Delete this ${rupees(p.amount)} payment? Bills it paid will open again.`) && run('dp', () => api(`/admin/payments/${p._id}`, { method: 'DELETE' }), 'Payment deleted')} icon={<Trash2 className="h-3.5 w-3.5" />} />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Owner">
            <dl className="-mt-1 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">Name</dt><dd className="font-medium">{data.owner?.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">Email</dt><dd className="truncate"><a href={`mailto:${data.owner?.email}`} className="hover:text-brand-600">{data.owner?.email}</a></dd></div>
              {b.phone && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Phone</dt><dd><a href={`tel:${b.phone}`} className="hover:text-brand-600">{b.phone}</a></dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-ink-muted">Last signed in</dt><dd>{data.owner?.lastLoginAt ? timeAgo(data.owner.lastLoginAt) : 'never'}</dd></div>
              {data.publicUrl && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Review page</dt><dd><a href={data.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">/b/{b.slug}<ExternalLink className="h-3 w-3" /></a></dd></div>}
            </dl>
          </Panel>

          <Panel title="Google" action={<GoogleBadge google={g} />}>
            {!g ? <p className="-mt-1 text-sm text-ink-muted">This business hasn’t connected Google yet. They connect it from their Google profile page; you can do it for them with “Open as business”.</p> : (
              <>
                <dl className="-mt-1 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Mode</dt><dd>{g.mode === 'live' ? 'Real Google profile' : 'Demo (nothing sent)'}</dd></div>
                  {g.email && <div className="flex justify-between gap-3"><dt className="text-ink-muted">Google account</dt><dd className="truncate">{g.email}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Location</dt><dd className="truncate">{g.locationTitle || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Last review check</dt><dd>{g.lastSyncAt ? timeAgo(g.lastSyncAt) : '—'}</dd></div>
                </dl>
                {g.lastError && <p className="mt-3 rounded-lg bg-rose-soft px-3 py-2 text-xs text-rose">{g.lastError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {g.mode === 'live' && <Button size="sm" variant="secondary" onClick={() => run('sync', () => api(`/admin/accounts/${id}/google/sync`, { method: 'POST' }), 'Synced with Google')} loading={busy === 'sync'} icon={<RefreshCw className="h-3.5 w-3.5" />}>Sync now</Button>}
                  {g.mapsUri && <a href={g.mapsUri} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon={<ExternalLink className="h-3.5 w-3.5" />}>Maps</Button></a>}
                  <Button size="sm" variant="ghost" className="text-rose" onClick={() => window.confirm('Disconnect Google for this business? They’ll need to connect again.') && run('dc', () => api(`/admin/accounts/${id}/google`, { method: 'DELETE' }), 'Google disconnected')} icon={<Unplug className="h-3.5 w-3.5" />}>Disconnect</Button>
                </div>
              </>
            )}
          </Panel>

          <Panel title="Private notes">
            <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only admins see this. E.g. “Paid cash at the shop, gave 1 month free for referral.”" />
            {notes !== (b.adminNotes || '') && <div className="mt-2 flex justify-end"><Button size="sm" onClick={() => run('notes', () => api(`/admin/accounts/${id}`, { method: 'PATCH', body: { adminNotes: notes } }), 'Notes saved')} loading={busy === 'notes'}>Save notes</Button></div>}
          </Panel>

          <Panel title="Activity" padded={false}>
            {data.logs.length === 0 ? <p className="px-5 pb-5 pt-2 text-sm text-ink-muted">Nothing yet.</p> : (
              <ol className="thin-scroll max-h-[420px] overflow-y-auto px-5 pb-4 pt-2">
                {data.logs.map((l: any) => (
                  <li key={l._id} className="relative border-l border-line-soft pb-3 pl-4 last:pb-0">
                    <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-brand-400" />
                    <p className="text-sm font-medium">{ACTION_LABEL[l.action] || l.action}</p>
                    {logDetail(l) && <p className="text-xs text-ink-soft">{logDetail(l)}</p>}
                    <p className="text-[11px] text-ink-faint">{timeAgo(l.createdAt)} · {l.admin?.name || (l.action === 'payment.reported' ? 'business' : 'automatic')}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      {pause.modal}
      <InvoiceModal open={invoiceModal.open} invoice={invoiceModal.invoice} accountId={b._id} onClose={() => setInvoiceModal({ open: false })} onDone={() => mutate()} nextPeriodPrice={{ price: bill.price, discount: bill.discount, planName: bill.account?.plan?.name }} />
      <RecordPaymentModal open={payModal.open} accountId={b._id} invoices={bill.invoices} defaultInvoice={payModal.invoice} onClose={() => setPayModal({ open: false })} onDone={() => mutate()} />
      <ConfirmPaymentModal payment={confirmPay} invoices={bill.invoices} onClose={() => setConfirmPay(null)} onDone={() => mutate()} />

      <Modal open={pw !== null} onClose={() => setPw(null)} title="Reset the owner’s password" footer={<><Button variant="ghost" onClick={() => setPw(null)}>Cancel</Button><Button disabled={(pw || '').length < 8} loading={busy === 'pw'} onClick={async () => { await run('pw', () => api(`/admin/accounts/${id}/reset-password`, { body: { password: pw } }), 'Password changed — share it with the owner'); setPw(null); }}>Set password</Button></>}>
        <Field label="New password" hint="At least 8 characters. Share it with the owner; they can change it in Settings."><Input value={pw || ''} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
      </Modal>

      <Modal open={del !== null} onClose={() => setDel(null)} title={`Delete ${b.name}?`} footer={<><Button variant="ghost" onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" disabled={del !== b.name} loading={busy === 'del'} onClick={() => run('del', async () => { await api(`/admin/accounts/${id}`, { method: 'DELETE', body: { confirmName: del } }); router.push('/accounts'); }, 'Account deleted')}>Delete forever</Button></>}>
        <p className="text-sm text-ink-soft">This deletes the business, its reviews, customers, photos, bills and payments. It can’t be undone. To stop access but keep the data, pause the account instead.</p>
        <Field className="mt-4" label={`Type “${b.name}” to confirm`}><Input value={del || ''} onChange={(e) => setDel(e.target.value)} /></Field>
      </Modal>
    </>
  );
}
