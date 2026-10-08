'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Badge, Button, Field, Input, Modal, Select, Textarea, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { cx, rupees, shortDate } from '@/lib/format';
import { METHOD_LABEL, STATE_LABEL } from '@/lib/billing';

export const today = () => new Date().toISOString().slice(0, 10);
export const toDateInput = (d?: string | Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export function StateBadge({ state }: { state: string }) {
  const s = STATE_LABEL[state] || STATE_LABEL.active;
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function GoogleBadge({ google }: { google: any }) {
  if (!google) return <Badge>Not connected</Badge>;
  if (['error', 'revoked'].includes(google.status)) return <Badge tone="bad">Google error</Badge>;
  if (google.mode === 'demo') return <Badge tone="warn">Demo</Badge>;
  if (google.status === 'needs_location') return <Badge tone="warn">Pick location</Badge>;
  return <Badge tone="good">Live</Badge>;
}

/** On/off switch for account access. */
export function AccessSwitch({ active, onChange, busy, label = 'Account access' }: { active: boolean; onChange: (v: boolean) => void; busy?: boolean; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!active);
      }}
      className={cx('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50', active ? 'bg-leaf' : 'bg-rose/70')}
      title={active ? 'Active — click to pause' : 'Paused — click to turn on'}
    >
      <span className={cx('absolute left-0 h-5 w-5 rounded-full bg-white shadow transition-transform', active ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

/** Asks for a reason before pausing an account, then calls the API. */
export function usePauseAccount(onDone: () => void) {
  const toast = useToast();
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const set = async (id: string, name: string, active: boolean, why = '') => {
    setBusy(true);
    try {
      await api(`/admin/accounts/${id}/status`, { body: { active, reason: why } });
      toast(active ? `${name} is active again` : `${name} is paused`);
      onDone();
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy(false);
    }
  };
  const toggle = (id: string, name: string, nextActive: boolean) => {
    if (nextActive) return set(id, name, true);
    setReason('');
    setTarget({ id, name });
  };
  const modal = (
    <Modal
      open={!!target}
      onClose={() => setTarget(null)}
      title={`Pause ${target?.name}?`}
      footer={
        <>
          <Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={async () => { await set(target!.id, target!.name, false, reason); setTarget(null); }}>Pause account</Button>
        </>
      }
    >
      <p className="text-sm text-ink-soft">The owner can still sign in and see their bills, but can’t use the app. Autopilot, auto replies and their public review page stop until you turn the account back on. Nothing is deleted.</p>
      <Field className="mt-4" label="Reason (the owner sees this)">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Payment pending for October" autoFocus />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['Payment pending', 'Trial ended', 'Requested by owner', 'Policy violation'].map((r) => (
          <button key={r} onClick={() => setReason(r)} className="rounded-full bg-mist px-2.5 py-1 text-xs text-ink-soft hover:bg-brand-50">{r}</button>
        ))}
      </div>
    </Modal>
  );
  return { toggle, modal, busy };
}

/** Record money received from a business (cash, UPI, bank…). */
export function RecordPaymentModal({ open, onClose, onDone, accountId, invoices, defaultInvoice }: { open: boolean; onClose: () => void; onDone: () => void; accountId?: string; invoices?: any[]; defaultInvoice?: any }) {
  const toast = useToast();
  const { data: accounts } = useSWR(open && !accountId ? '/admin/accounts?limit=200' : null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { data: detail } = useSWR(open && (accountId || form.account) && !invoices ? `/admin/accounts/${accountId || form.account}` : null);
  const bills = (invoices || detail?.billing?.invoices || []).filter((i: any) => ['pending', 'partial'].includes(i.status));

  useEffect(() => {
    if (!open) return;
    setForm({ account: accountId || '', amount: defaultInvoice ? String(defaultInvoice.balance) : '', method: 'upi', reference: '', paidAt: today(), notes: '', invoiceId: defaultInvoice?._id || '' });
    setError('');
  }, [open, accountId, defaultInvoice]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/accounts/${accountId || form.account}/payments`, { body: { amount: Number(form.amount), method: form.method, reference: form.reference, paidAt: form.paidAt, notes: form.notes, invoiceId: form.invoiceId || undefined } });
      toast(`Payment of ${rupees(Number(form.amount))} recorded`);
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record a payment" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy} disabled={!Number(form.amount) || !(accountId || form.account)}>Save payment</Button></>}>
      <div className="space-y-4">
        {!accountId && (
          <Field label="Account">
            <Select value={form.account || ''} onChange={(e) => setForm({ ...form, account: e.target.value, invoiceId: '' })}>
              <option value="">Choose a business…</option>
              {(accounts?.accounts || []).map((a: any) => <option key={a._id} value={a._id}>{a.name}{a.balance > 0 ? ` — ${rupees(a.balance)} due` : ''}</option>)}
            </Select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount received (₹)"><Input type="number" min={1} inputMode="decimal" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <Field label="Paid by">
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          </Field>
          <Field label="Reference / receipt no."><Input value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="UTR, cheque or receipt number" /></Field>
          <Field label="Date received"><Input type="date" value={form.paidAt || ''} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></Field>
        </div>
        <Field label="Apply to bill" hint="Leave on automatic to pay the oldest bills first. Anything extra is kept as credit for the next bill.">
          <Select value={form.invoiceId || ''} onChange={(e) => {
            const inv = bills.find((b: any) => b._id === e.target.value);
            setForm({ ...form, invoiceId: e.target.value, amount: inv && !form.amount ? String(inv.balance) : form.amount });
          }}>
            <option value="">Automatic (oldest first)</option>
            {bills.map((b: any) => <option key={b._id} value={b._id}>{b.number} · {b.description || b.planName} · {rupees(b.balance)} left</option>)}
          </Select>
        </Field>
        <Field label="Note (optional)"><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error && <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p>}
      </div>
    </Modal>
  );
}

/** Create a bill, or edit amount / discount / due date of one. */
export function InvoiceModal({ open, onClose, onDone, accountId, invoice, nextPeriodPrice }: { open: boolean; onClose: () => void; onDone: () => void; accountId: string; invoice?: any; nextPeriodPrice?: { price: number; discount: number; planName?: string } }) {
  const toast = useToast();
  const [mode, setMode] = useState<'next' | 'custom'>('next');
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const editing = !!invoice;

  useEffect(() => {
    if (!open) return;
    setError('');
    setMode(nextPeriodPrice && nextPeriodPrice.price > 0 && !invoice ? 'next' : 'custom');
    setForm(invoice
      ? { amount: String(invoice.amount), discount: String(invoice.discount || 0), dueDate: toDateInput(invoice.dueDate), description: invoice.description || '', notes: invoice.notes || '' }
      : { amount: '', discount: nextPeriodPrice && nextPeriodPrice.price > 0 ? String(nextPeriodPrice.discount ?? 0) : '0', dueDate: '', description: '', notes: '', periodStart: '', periodEnd: '' });
  }, [open, invoice, nextPeriodPrice]);

  const amount = Number(form.amount || 0);
  const discount = Number(form.discount || 0);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api(`/admin/invoices/${invoice._id}`, { method: 'PATCH', body: { amount, discount, dueDate: form.dueDate || undefined, description: form.description, notes: form.notes } });
        toast('Bill updated');
      } else if (mode === 'next') {
        await api(`/admin/accounts/${accountId}/invoices`, { body: { nextPeriod: true, discount, notes: form.notes || undefined } });
        toast('Bill created for the next period');
      } else {
        await api(`/admin/accounts/${accountId}/invoices`, { body: { amount, discount, description: form.description, dueDate: form.dueDate || undefined, periodStart: form.periodStart || undefined, periodEnd: form.periodEnd || undefined, notes: form.notes } });
        toast('Bill created');
      }
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${invoice.number}` : 'New bill'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>{editing ? 'Save' : 'Create bill'}</Button></>}>
      <div className="space-y-4">
        {!editing && nextPeriodPrice && nextPeriodPrice.price > 0 && (
          <div className="inline-flex rounded-lg bg-mist p-0.5">
            {[['next', 'Next period of plan'], ['custom', 'Custom amount']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setMode(v as any); setForm((f: any) => ({ ...f, discount: v === 'next' ? String(nextPeriodPrice?.discount ?? 0) : '0' })); }} className={cx('h-8 rounded-md px-3 text-sm font-medium', mode === v ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-muted')}>{l}</button>
            ))}
          </div>
        )}
        {mode === 'next' && !editing ? (
          <div className="rounded-xl bg-mist p-4 text-sm">
            <p>{nextPeriodPrice?.planName || 'Plan'} · actual price <span className="font-semibold">{rupees(nextPeriodPrice?.price)}</span></p>
            <p className="mt-1 text-ink-muted">Covers the period after the last bill (or from today).</p>
          </div>
        ) : (
          <>
            <Field label="What it’s for"><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Setup fee, October plan, extra photos…" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Actual price (₹)"><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Due date"><Input type="date" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
              {!editing && <Field label="Period from (optional)"><Input type="date" value={form.periodStart || ''} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} /></Field>}
              {!editing && <Field label="Period to (optional)"><Input type="date" value={form.periodEnd || ''} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></Field>}
            </div>
          </>
        )}
        <Field label="Discount (₹)" hint={mode === 'next' && !editing ? 'Defaults to the account’s discount' : undefined}>
          <Input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </Field>
        {(mode === 'custom' || editing) && amount > 0 && (
          <p className="rounded-lg bg-mist px-3 py-2 text-sm">To pay: <span className="font-semibold">{rupees(Math.max(0, amount - discount))}</span>{discount > 0 && <span className="text-ink-muted"> ({rupees(amount)} − {rupees(discount)} discount)</span>}</p>
        )}
        <Field label="Note (optional)"><Textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        {error && <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p>}
      </div>
    </Modal>
  );
}

export function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-xl2 border border-line-soft bg-paper px-5 py-4 shadow-lift">
      <p className="text-[13px] text-ink-muted">{label}</p>
      <p className={cx('mt-1 font-display text-[26px] font-semibold leading-none tabular', tone === 'bad' ? 'text-rose' : tone === 'warn' ? 'text-amber' : tone === 'good' ? 'text-leaf' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-1.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Confirm a payment a business reported ("I've paid"), with the amount actually received. */
export function ConfirmPaymentModal({ payment, invoices, onClose, onDone }: { payment: any; invoices: any[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (payment) {
      setAmount(String(payment.amount));
      setInvoiceId('');
    }
  }, [payment]);
  const open = (invoices || []).filter((i: any) => ['pending', 'partial'].includes(i.status));
  return (
    <Modal open={!!payment} onClose={onClose} title="Confirm payment" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={async () => {
      setBusy(true);
      try {
        await api(`/admin/payments/${payment._id}/confirm`, { body: { amount: Number(amount), invoiceId: invoiceId || undefined } });
        toast('Payment confirmed');
        onDone();
        onClose();
      } catch (e: any) {
        toast(e.message, 'bad');
      } finally {
        setBusy(false);
      }
    }}>Confirm — money received</Button></>}>
      {payment && (
        <div className="space-y-4">
          <p className="rounded-lg bg-mist px-3 py-2 text-sm">{METHOD_LABEL[payment.method]} · reference <span className="font-mono font-semibold">{payment.reference || '—'}</span> · {shortDate(payment.paidAt)}</p>
          <p className="text-sm text-ink-muted">Check your bank or UPI app for this reference before confirming.</p>
          <Field label="Amount actually received (₹)"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          {open.length > 0 && (
            <Field label="Apply to bill">
              <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">Automatic (oldest first)</option>
                {open.map((i: any) => <option key={i._id} value={i._id}>{i.number} · {rupees(i.balance)} left</option>)}
              </Select>
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
