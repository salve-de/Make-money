import React from 'react';
import { CompanyRecord } from '@/types/terminal';

type AuditStatus = CompanyRecord['verifiedStatus'];

const STATUS_LABELS: Record<AuditStatus, string> = {
  AUDITED_PUBLIC: '有報・公的決算照合',
  VERIFIED_STRIPE: 'Stripe・通帳照合',
  ESTIMATED_MODEL: '市場調査推計モデル',
};

const STATUS_STYLES: Record<AuditStatus, string> = {
  AUDITED_PUBLIC: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  VERIFIED_STRIPE: 'bg-slate-100 text-slate-900 border-slate-300',
  ESTIMATED_MODEL: 'bg-amber-50 text-amber-800 border-amber-200',
};

export function AuditStatusBadge({
  status,
  compact = false,
}: {
  status: AuditStatus;
  compact?: boolean;
}) {
  return (
    <span
      title={STATUS_LABELS[status]}
      className={`inline-flex items-center border font-mono font-bold ${
        compact ? 'px-1 py-0.5 text-[8px] rounded' : 'px-2 py-0.5 text-[10px]'
      } ${STATUS_STYLES[status]}`}
    >
      {compact
        ? status === 'AUDITED_PUBLIC'
          ? '有報'
          : status === 'VERIFIED_STRIPE'
            ? '決済'
            : '推計'
        : STATUS_LABELS[status]}
    </span>
  );
}
