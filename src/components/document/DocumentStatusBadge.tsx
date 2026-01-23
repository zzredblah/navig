'use client';

import { Badge } from '@/components/ui/badge';
import type { DocumentStatus } from '@/types/database';

const statusConfig: Record<DocumentStatus, { label: string; className: string }> = {
  draft: { label: '작성 중', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  pending: { label: '검토 대기', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
  approved: { label: '승인', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  rejected: { label: '반려', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  signed: { label: '서명 완료', className: 'bg-primary-100 text-primary-700 hover:bg-primary-100' },
};

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
}

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
