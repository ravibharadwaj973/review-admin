'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Check, Download, Plus, X } from 'lucide-react';
import { Button, Empty, PageHeader, Panel, Segmented, Select, Skeleton, useToast } from '@/components/ui';
import { ConfirmPaymentModal, RecordPaymentModal } from '@/components/shared';
import { InvoiceStatus, METHOD_LABEL, PaymentStatus } from '@/lib/billing';
import { api } from '@/lib/api';
import { rupees, shortDate } from '@/lib/format';

type Tab = 'check' | 'all' | 'bills';

function csv(rows: (string | number)[][], name: string) {
  const text = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

function PaymentsInner() {
  const params = useSearchParams();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'check');
  const [billFilter, setBillFilter] = useState('open');
  const [method, setMethod] = useState('');
  const { data: pending, mutate: mutatePending } = useSWR('/admin/payments?status=pending');
  const { data: all, mutate: mutateAll } = useSWR(tab === 'all' ? `/admin/payments${method ? `?method=${method}` : ''}` : null);
  const { data: bills, mutate: mutateBills } = useSWR(tab === 'bills' ? `/admin/invoices?status=${billFilter}` : null);
  const [recording, setRecording] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const refresh = () => {
    mutatePending();
    mutateAll();
    mutateBills();
  };
  const reject = async (p: any) => {
    const reason = window.prompt('Why are you rejecting it? (the business won’t see this)') ?? null;
    if (reason === null) return;
    try {
      await api(`/admin/payments/${p._id}/reject`, { body: { reason } });
      toast('Payment rejected');
      refresh();
    } catch (e: any) {
      toast(e.message, 'bad');
    }
  };

  const pendingList = pending?.payments || [];
  const confirmed = (all?.payments || []).filter((p: any) => p.status === 'confirmed');
  const total = confirmed.reduce((s: number, p: any) => s + p.amount, 0);

  return (
    <>
      <PageHeader
        title="Payments & bills"
        subtitle="Record money you receive by UPI, cash or bank, check payments businesses tell you about, and see every bill — pending, part paid or fully paid."
        actions={<Button onClick={() => setRecording(true)} icon={<Plus className="h-4 w-4" />}>Record a payment</Button>}
      />
      <div className="mb-5">
        <Segmented<Tab> value={tab} onChange={setTab} options={[{ value: 'check', label: 'To check', count: pendingList.length }, { value: 'all', label: 'All payments' }, { value: 'bills', label: 'Bills' }]} />
      </div>

      {tab === 'check' && (
        <Panel padded={false}>
          {!pending ? <Skeleton className="m-5 h-20" /> : pendingList.length === 0 ? (
            <Empty icon={<Check className="h-6 w-6" />} title="Nothing to check">When a business sends “I’ve paid” with a reference, it appears here for you to confirm against your bank or UPI app.</Empty>
          ) : (
            <ul className="divide-y divide-line-soft">
              {pendingList.map((p: any) => (
                <li key={p._id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link href={`/accounts/${p.business?._id}`} className="font-medium hover:text-brand-600">{p.business?.name}</Link>
                    <p className="text-ink-muted">{METHOD_LABEL[p.method]} · ref <span className="font-mono text-ink">{p.reference}</span> · paid {shortDate(p.paidAt)}</p>
                    {p.notes && <p className="text-xs text-ink-muted">{p.notes}</p>}
                  </div>
                  <span className="font-display text-lg font-semibold tabular">{rupees(p.amount)}</span>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setConfirm(p)} icon={<Check className="h-3.5 w-3.5" />}>Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => reject(p)} icon={<X className="h-3.5 w-3.5" />}>Reject</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'all' && (
        <Panel padded={false}>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
            <Select className="h-9 w-44 py-1 text-sm" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Method">
              <option value="">All methods</option>
              {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <p className="text-sm text-ink-muted">Confirmed: <span className="font-semibold text-ink">{rupees(total)}</span></p>
            <Button size="sm" variant="ghost" className="ml-auto" icon={<Download className="h-3.5 w-3.5" />} onClick={() => csv([['Date', 'Business', 'Amount', 'Method', 'Reference', 'Status', 'Bills'], ...(all?.payments || []).map((p: any) => [shortDate(p.paidAt), p.business?.name, p.amount, METHOD_LABEL[p.method], p.reference, p.status, (p.allocations || []).map((a: any) => a.invoice?.number).join(' ')])], 'payments.csv')}>Export CSV</Button>
          </div>
          {!all ? <Skeleton className="m-5 h-40" /> : (
            <div className="thin-scroll mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] whitespace-nowrap text-sm">
                <thead className="text-left text-xs text-ink-muted"><tr className="border-y border-line-soft"><th className="px-5 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Business</th><th className="px-3 py-2.5 text-right font-medium">Amount</th><th className="px-3 py-2.5 font-medium">Method</th><th className="px-3 py-2.5 font-medium">Reference</th><th className="px-3 py-2.5 font-medium">Applied to</th><th className="px-5 py-2.5 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-line-soft">
                  {(all.payments || []).map((p: any) => (
                    <tr key={p._id}>
                      <td className="px-5 py-3 text-ink-muted">{shortDate(p.paidAt)}</td>
                      <td className="px-3 py-3"><Link href={`/accounts/${p.business?._id}`} className="font-medium hover:text-brand-600">{p.business?.name}</Link></td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{rupees(p.amount)}</td>
                      <td className="px-3 py-3">{METHOD_LABEL[p.method]}</td>
                      <td className="px-3 py-3 font-mono text-xs">{p.reference || '—'}</td>
                      <td className="px-3 py-3 text-xs text-ink-muted">{(p.allocations || []).map((a: any) => a.invoice?.number).filter(Boolean).join(', ') || (p.status === 'confirmed' ? 'credit' : '—')}</td>
                      <td className="px-5 py-3"><PaymentStatus p={p} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(all.payments || []).length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No payments yet.</p>}
            </div>
          )}
        </Panel>
      )}

      {tab === 'bills' && (
        <Panel padded={false}>
          <div className="flex flex-wrap items-center gap-3 px-5 pt-5">
            <Segmented value={billFilter} onChange={setBillFilter} options={[{ value: 'open', label: 'Unpaid' }, { value: 'overdue', label: 'Overdue' }, { value: 'partial', label: 'Part paid' }, { value: 'paid', label: 'Fully paid' }, { value: 'waived', label: 'Waived' }, { value: 'all', label: 'All' }]} />
            {bills && <p className="ml-auto text-sm text-ink-muted">Balance: <span className="font-semibold text-ink">{rupees((bills.invoices || []).reduce((s: number, i: any) => s + (i.balance || 0), 0))}</span></p>}
          </div>
          {!bills ? <Skeleton className="m-5 h-40" /> : (
            <div className="thin-scroll mt-3 overflow-x-auto">
              <table className="w-full min-w-[920px] whitespace-nowrap text-sm">
                <thead className="text-left text-xs text-ink-muted"><tr className="border-y border-line-soft"><th className="px-5 py-2.5 font-medium">Bill</th><th className="px-3 py-2.5 font-medium">Business</th><th className="px-3 py-2.5 font-medium">For</th><th className="px-3 py-2.5 text-right font-medium">Price</th><th className="px-3 py-2.5 text-right font-medium">Discount</th><th className="px-3 py-2.5 text-right font-medium">Paid</th><th className="px-3 py-2.5 text-right font-medium">Balance</th><th className="px-3 py-2.5 font-medium">Due</th><th className="px-5 py-2.5 font-medium">Status</th></tr></thead>
                <tbody className="divide-y divide-line-soft">
                  {(bills.invoices || []).map((i: any) => (
                    <tr key={i._id}>
                      <td className="px-5 py-3 font-mono text-xs"><a href={`/print/invoice/${i._id}`} target="_blank" rel="noreferrer" className="hover:text-brand-600 hover:underline">{i.number}</a></td>
                      <td className="px-3 py-3"><Link href={`/accounts/${i.business?._id}`} className="font-medium hover:text-brand-600">{i.business?.name}</Link></td>
                      <td className="px-3 py-3 text-ink-soft">{i.description || i.planName || '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{rupees(i.amount)}</td>
                      <td className="px-3 py-3 text-right tabular text-leaf">{i.discount ? `−${rupees(i.discount)}` : '—'}</td>
                      <td className="px-3 py-3 text-right tabular">{rupees(i.paid)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular">{rupees(i.balance)}</td>
                      <td className="px-3 py-3">{shortDate(i.dueDate)}</td>
                      <td className="px-5 py-3"><InvoiceStatus inv={i} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(bills.invoices || []).length === 0 && <p className="px-5 py-6 text-sm text-ink-muted">No bills here.</p>}
            </div>
          )}
        </Panel>
      )}

      <RecordPaymentModal open={recording} onClose={() => setRecording(false)} onDone={refresh} />
      <ConfirmPaymentModal payment={confirm} invoices={[]} onClose={() => setConfirm(null)} onDone={refresh} />
    </>
  );
}

export default function PaymentsPage() {
  return <Suspense><PaymentsInner /></Suspense>;
}
