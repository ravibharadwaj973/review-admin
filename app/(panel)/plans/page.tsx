'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Check, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Empty, Field, Input, Modal, PageHeader, Select, Skeleton, Textarea, Toggle, useToast } from '@/components/ui';
import { CYCLE_LABEL } from '@/lib/billing';
import { api } from '@/lib/api';
import { cx, rupees } from '@/lib/format';

const CYCLES = [['monthly', 'Monthly'], ['quarterly', 'Every 3 months'], ['half_yearly', 'Every 6 months'], ['yearly', 'Yearly']];

function PlanModal({ plan, open, onClose, onDone }: { plan: any; open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(plan ? { ...plan, price: String(plan.price), features: (plan.features || []).join('\n') } : { name: '', description: '', price: '', billingCycle: 'monthly', features: '', active: true, sortOrder: 0 });
  }, [open, plan]);
  const save = async () => {
    setBusy(true);
    setError('');
    const body = { name: form.name, description: form.description, price: Number(form.price || 0), billingCycle: form.billingCycle, features: String(form.features || '').split('\n').map((s: string) => s.trim()).filter(Boolean), active: form.active, sortOrder: Number(form.sortOrder || 0) };
    try {
      if (plan?._id) await api(`/admin/plans/${plan._id}`, { method: 'PATCH', body });
      else await api('/admin/plans', { body });
      toast(plan?._id ? 'Plan saved' : 'Plan created');
      onDone();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={plan?._id ? `Edit ${plan.name}` : 'New plan'} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={busy}>Save plan</Button></>}>
      <div className="space-y-4">
        <Field label="Plan name"><Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Growth" autoFocus /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Actual price (₹)"><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Billed"><Select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>{CYCLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        </div>
        <Field label="Short description"><Input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="For busy salons that want Google on autopilot" /></Field>
        <Field label="What’s included" hint="One per line — the business sees this on its Billing page"><Textarea rows={4} value={form.features || ''} onChange={(e) => setForm({ ...form, features: e.target.value })} /></Field>
        <Toggle checked={form.active !== false} onChange={(v) => setForm({ ...form, active: v })} label="Available for new accounts" description="Turning it off keeps it on existing accounts." />
        {plan?.accounts > 0 && <p className="rounded-lg bg-mist px-3 py-2 text-sm text-ink-muted">{plan.accounts} account{plan.accounts > 1 ? 's are' : ' is'} on this plan. A new price applies to their next bill (unless they have their own price).</p>}
        {error && <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p>}
      </div>
    </Modal>
  );
}

export default function PlansPage() {
  const toast = useToast();
  const { data, mutate } = useSWR('/admin/plans');
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const remove = async (p: any) => {
    if (!window.confirm(`Delete the ${p.name} plan?`)) return;
    try {
      await api(`/admin/plans/${p._id}`, { method: 'DELETE' });
      mutate();
    } catch (e: any) {
      toast(e.message, 'bad');
    }
  };

  return (
    <>
      <PageHeader
        title="Plans & prices"
        subtitle="What you sell and for how much. Give any account its own price or a discount from the account page."
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }} icon={<Plus className="h-4 w-4" />}>New plan</Button>}
      />
      {!data ? <div className="grid gap-5 md:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div> : data.plans.length === 0 ? (
        <Empty icon={<Layers className="h-6 w-6" />} title="No plans yet" action={<Button onClick={() => { setEditing(null); setOpen(true); }}>Create your first plan</Button>}>For example: Starter ₹999 a month, Growth ₹2,499 a month, Pro ₹24,990 a year.</Empty>
      ) : (
        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.plans.map((p: any) => (
            <article key={p._id} className={cx('flex h-full flex-col rounded-xl2 border bg-paper p-5 shadow-lift', p.active ? 'border-line-soft' : 'border-dashed border-line opacity-75')}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                {p.active ? <Badge tone="good">Available</Badge> : <Badge>Off</Badge>}
              </div>
              {p.description && <p className="mt-1 text-sm text-ink-muted">{p.description}</p>}
              <p className="mt-4"><span className="font-display text-3xl font-semibold">{rupees(p.price)}</span><span className="text-ink-muted"> / {CYCLE_LABEL[p.billingCycle]}</span></p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-ink-soft">
                {(p.features || []).map((f: string) => <li key={f} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />{f}</li>)}
              </ul>
              <div className="mt-5 flex items-center gap-2 border-t border-line-soft pt-4">
                <span className="flex-1 text-sm text-ink-muted">{p.accounts} account{p.accounts === 1 ? '' : 's'}</span>
                <Button size="sm" variant="secondary" onClick={() => { setEditing(p); setOpen(true); }} icon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
                {p.accounts === 0 && <Button size="sm" variant="ghost" className="text-ink-faint hover:text-rose" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} icon={<Trash2 className="h-3.5 w-3.5" />} />}
              </div>
            </article>
          ))}
        </div>
      )}
      <PlanModal plan={editing} open={open} onClose={() => setOpen(false)} onDone={() => mutate()} />
    </>
  );
}
