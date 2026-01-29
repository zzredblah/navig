'use client';

import { useState, useEffect } from 'react';
import { Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Payment } from '@/types/subscription';

interface PaymentHistoryProps {
  initialPayments?: Payment[];
}

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: '대기', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', className: 'bg-green-100 text-green-700' },
  failed: { label: '실패', className: 'bg-red-100 text-red-700' },
  refunded: { label: '환불', className: 'bg-gray-100 text-gray-600' },
  partial_refund: { label: '부분환불', className: 'bg-gray-100 text-gray-600' },
};

export function PaymentHistory({ initialPayments }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [isLoading, setIsLoading] = useState(!initialPayments);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!initialPayments) {
      fetchPayments();
    }
  }, []);

  const fetchPayments = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payments/history?page=${pageNum}&limit=10`);
      if (response.ok) {
        const { data } = await response.json();
        if (pageNum === 1) {
          setPayments(data.payments);
        } else {
          setPayments((prev) => [...prev, ...data.payments]);
        }
        setHasMore(data.pagination.page < data.pagination.total_pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 내역</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 내역</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Receipt className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">결제 내역이 없습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 내역</h3>

      <div className="space-y-3">
        {payments.map((payment) => {
          const status = statusLabels[payment.status] || statusLabels.pending;

          return (
            <div
              key={payment.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-gray-50"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {payment.order_name}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(payment.paid_at || payment.created_at)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">
                  {formatAmount(payment.amount)}
                </span>
                <Badge className={status.className}>{status.label}</Badge>
                {payment.receipt_url && (
                  <a
                    href={payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchPayments(page + 1)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            더 보기
          </Button>
        </div>
      )}
    </div>
  );
}
