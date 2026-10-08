import { Check } from 'lucide-react';
import { Badge } from '@/components/ui';

export const CYCLE_LABEL: Record<string, string> = { monthly: 'month', quarterly: '3 months', half_yearly: '6 months', yearly: 'year' };
export const METHOD_LABEL: Record<string, string> = { upi: 'UPI', cash: 'Cash', bank_transfer: 'Bank transfer', card: 'Card', cheque: 'Cheque', other: 'Other' };

export function InvoiceStatus({ inv }: { inv: any }) {
  const overdue = ['pending', 'partial'].includes(inv.status) && inv.dueDate && new Date(inv.dueDate) < new Date();
  if (inv.status === 'paid') return <Badge tone="good"><Check className="h-3 w-3" />Paid</Badge>;
  if (inv.status === 'waived') return <Badge tone="info">Waived</Badge>;
  if (inv.status === 'cancelled') return <Badge>Cancelled</Badge>;
  if (overdue) return <Badge tone="bad">{inv.status === 'partial' ? 'Part paid · overdue' : 'Overdue'}</Badge>;
  if (inv.status === 'partial') return <Badge tone="warn">Part paid</Badge>;
  return <Badge tone="warn">Pending</Badge>;
}

export function PaymentStatus({ p }: { p: any }) {
  if (p.status === 'confirmed') return <Badge tone="good">Confirmed</Badge>;
  if (p.status === 'rejected') return <Badge tone="bad">Not found</Badge>;
  return <Badge tone="warn">Being checked</Badge>;
}

export const STATE_LABEL: Record<string, { label: string; tone: any }> = {
  active: { label: 'Active', tone: 'good' },
  trial: { label: 'Free trial', tone: 'info' },
  due: { label: 'Payment due', tone: 'warn' },
  overdue: { label: 'Overdue', tone: 'bad' },
  suspended: { label: 'Paused', tone: 'bad' },
  no_plan: { label: 'No plan', tone: 'neutral' },
};
