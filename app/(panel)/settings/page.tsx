'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Trash2 } from 'lucide-react';
import { Badge, Button, Field, Input, PageHeader, Panel, Skeleton, Textarea, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { timeAgo } from '@/lib/format';

const ACTIONS: Record<string, string> = {
  'account.created': 'created an account', 'account.updated': 'changed plan or price', 'account.notes': 'updated notes', 'account.suspended': 'paused an account',
  'account.reactivated': 'turned an account back on', 'account.opened_as_owner': 'opened a business', 'owner.password_reset': 'reset an owner’s password', 'account.deleted': 'deleted an account',
  'invoice.created': 'created a bill', 'invoice.updated': 'changed a bill', 'invoice.deleted': 'deleted a bill', 'payment.recorded': 'recorded a payment', 'payment.reported': 'reported a payment',
  'payment.confirmed': 'confirmed a payment', 'payment.rejected': 'rejected a payment', 'payment.deleted': 'deleted a payment', 'google.synced': 'synced Google', 'google.disconnected': 'disconnected Google',
  'plan.created': 'created a plan', 'plan.updated': 'changed a plan', 'settings.updated': 'changed settings', 'admin.added': 'added an admin', 'admin.removed': 'removed an admin',
};

export default function AdminSettings() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, mutate } = useSWR('/admin/settings');
  const { data: activity } = useSWR('/admin/activity');
  const [form, setForm] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', password: '' });
  const [me, setMe] = useState({ name: '', currentPassword: '', newPassword: '', confirm: '' });
  useEffect(() => setMe((m) => ({ ...m, name: user?.name || '' })), [user?.name]);
  const saveMe = async () => {
    if (me.newPassword && me.newPassword !== me.confirm) return toast('The new passwords don’t match', 'bad');
    setBusy('me');
    try {
      const body: any = { name: me.name };
      if (me.newPassword) Object.assign(body, { currentPassword: me.currentPassword, newPassword: me.newPassword });
      await api('/auth/me', { method: 'PATCH', body });
      setMe({ ...me, currentPassword: '', newPassword: '', confirm: '' });
      toast(me.newPassword ? 'Password changed' : 'Saved');
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  };
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (data?.settings) setForm({ ...data.settings });
  }, [data?.settings]);

  if (!data || !form) return <><PageHeader title="Settings & admins" /><Skeleton className="h-96" /></>;
  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const save = async () => {
    setBusy('save');
    try {
      const { companyName, upiId, bankDetails, paymentInstructions, supportPhone, supportEmail, defaultTrialDays, invoiceDueDays, autoSuspendOverdueDays } = form;
      await api('/admin/settings', { method: 'PATCH', body: { companyName, upiId, bankDetails, paymentInstructions, supportPhone, supportEmail, defaultTrialDays: Number(defaultTrialDays), invoiceDueDays: Number(invoiceDueDays), autoSuspendOverdueDays: Number(autoSuspendOverdueDays) } });
      toast('Settings saved');
      mutate();
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  };
  const addAdmin = async () => {
    setBusy('add');
    try {
      const r = await api('/admin/admins', { body: { email, name: newAdmin.name || undefined, password: newAdmin.password || undefined } });
      toast(r.created ? `Admin login created — share the email and password with them` : 'Admin added');
      setEmail('');
      setNewAdmin({ name: '', password: '' });
      mutate();
    } catch (e: any) {
      toast(e.message, 'bad');
    } finally {
      setBusy('');
    }
  };
  const removeAdmin = async (a: any) => {
    if (!window.confirm(`Remove admin access for ${a.email}?`)) return;
    try {
      await api(`/admin/admins/${a.id}`, { method: 'DELETE' });
      mutate();
    } catch (e: any) {
      toast(e.message, 'bad');
    }
  };

  return (
    <>
      <PageHeader title="Settings & admins" subtitle="How businesses pay you, trial and payment rules, and who can open this admin area." />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Panel title="How businesses pay you">
            <p className="-mt-1 mb-4 text-sm text-ink-muted">Shown on every business’s Billing page, with a UPI QR code for the amount due.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your company name"><Input value={form.companyName || ''} onChange={(e) => set('companyName', e.target.value)} /></Field>
              <Field label="UPI ID"><Input value={form.upiId || ''} onChange={(e) => set('upiId', e.target.value)} placeholder="yourname@okicici" /></Field>
              <Field label="Bank details" className="sm:col-span-2"><Textarea rows={3} value={form.bankDetails || ''} onChange={(e) => set('bankDetails', e.target.value)} placeholder={'A/c name: …\nA/c no: …\nIFSC: …'} /></Field>
              <Field label="Payment instructions" className="sm:col-span-2"><Textarea rows={2} value={form.paymentInstructions || ''} onChange={(e) => set('paymentInstructions', e.target.value)} /></Field>
              <Field label="Support phone"><Input value={form.supportPhone || ''} onChange={(e) => set('supportPhone', e.target.value)} inputMode="tel" /></Field>
              <Field label="Support email"><Input type="email" value={form.supportEmail || ''} onChange={(e) => set('supportEmail', e.target.value)} /></Field>
            </div>
          </Panel>

          <Panel title="Trials and payment rules">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Free trial for new sign-ups" hint="Days. 0 = no trial"><Input type="number" min={0} value={form.defaultTrialDays} onChange={(e) => set('defaultTrialDays', e.target.value)} /></Field>
              <Field label="Bills are due after" hint="Days after the bill is made"><Input type="number" min={0} value={form.invoiceDueDays} onChange={(e) => set('invoiceDueDays', e.target.value)} /></Field>
              <Field label="Pause automatically when overdue by" hint="Days. 0 = never pause by itself"><Input type="number" min={0} value={form.autoSuspendOverdueDays} onChange={(e) => set('autoSuspendOverdueDays', e.target.value)} /></Field>
            </div>
            <p className="mt-3 text-sm text-ink-muted">{Number(form.autoSuspendOverdueDays) > 0 ? `An account is paused when a bill is more than ${form.autoSuspendOverdueDays} days late, and turns back on by itself once it’s paid.` : 'Accounts are only paused when you flip the switch.'}</p>
          </Panel>
          <div className="flex justify-end"><Button onClick={save} loading={busy === 'save'}>Save settings</Button></div>
        </div>

        <div className="space-y-6">
          <Panel title="Your admin login">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name"><Input value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} /></Field>
              <Field label="Email"><Input value={user?.email || ''} disabled /></Field>
              <Field label="Current password" className="sm:col-span-2"><Input type="password" autoComplete="current-password" value={me.currentPassword} onChange={(e) => setMe({ ...me, currentPassword: e.target.value })} /></Field>
              <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={me.newPassword} onChange={(e) => setMe({ ...me, newPassword: e.target.value })} /></Field>
              <Field label="New password again"><Input type="password" autoComplete="new-password" value={me.confirm} onChange={(e) => setMe({ ...me, confirm: e.target.value })} /></Field>
            </div>
            <div className="mt-4 flex justify-end"><Button onClick={saveMe} loading={busy === 'me'} disabled={!!me.newPassword && (me.newPassword.length < 8 || !me.currentPassword)}>Save</Button></div>
          </Panel>

          <Panel title="Admins">
            <ul className="-mt-1 divide-y divide-line-soft">
              {data.admins.map((a: any) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.name}{String(a.id) === String(user?.id) && <span className="text-ink-muted"> (you)</span>}</p>
                    <p className="truncate text-xs text-ink-muted">{a.email} · {a.lastLoginAt ? `seen ${timeAgo(a.lastLoginAt)}` : 'never signed in'}</p>
                  </div>
                  {a.fromEnv ? <Badge>From server .env</Badge> : String(a.id) !== String(user?.id) && <Button size="sm" variant="ghost" className="text-ink-faint hover:text-rose" aria-label={`Remove ${a.email}`} onClick={() => removeAdmin(a)} icon={<Trash2 className="h-3.5 w-3.5" />} />}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-2 border-t border-line-soft pt-4 sm:grid-cols-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" aria-label="Email of the new admin" className="sm:col-span-2" />
              <Input value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} placeholder="Name (new login only)" aria-label="Name" />
              <Input value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} placeholder="Password (new login only)" aria-label="Password" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">Someone who already has a ReviewRankr login only needs the email. Admins can see and change every account.</p>
              <Button onClick={addAdmin} loading={busy === 'add'} disabled={!email.includes('@') || (!!newAdmin.password && newAdmin.password.length < 8)}>Add admin</Button>
            </div>
          </Panel>

          <Panel title="Recent admin activity" padded={false}>
            {!activity ? <Skeleton className="m-5 h-40" /> : (
              <ul className="thin-scroll max-h-[460px] divide-y divide-line-soft overflow-y-auto">
                {activity.logs.map((l: any) => (
                  <li key={l._id} className="px-5 py-2.5 text-sm">
                    <span className="font-medium">{l.admin?.name || (l.action === 'payment.reported' ? 'A business' : 'ReviewRankr')}</span> {ACTIONS[l.action] || l.action}
                    {l.business && <> · <Link href={`/accounts/${l.business._id}`} className="text-brand-600 hover:underline">{l.business.name}</Link></>}
                    <span className="block text-xs text-ink-faint">{timeAgo(l.createdAt)}</span>
                  </li>
                ))}
                {activity.logs.length === 0 && <li className="px-5 py-6 text-sm text-ink-muted">Nothing yet.</li>}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
