'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { Spinner } from '@/components/ui';
import { InvoiceSheet } from '@/components/InvoiceSheet';
import { useAuth } from '@/lib/auth';

export default function PrintInvoice() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  const { data, error } = useSWR(user ? `/admin/invoices/${id}` : null);
  if (error) return <p className="p-10 text-center text-ink-muted">{error.message}</p>;
  if (!data) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  return <InvoiceSheet doc={data} />;
}
