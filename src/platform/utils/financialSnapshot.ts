import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import type { FinancialEntity } from '../types/terminal';

export type SnapshotEntity = Pick<FinancialEntity, 'id' | 'name' | 'pnl'>;

/** Use the same record as the ledger; never maintain a second set of promotional figures. */
export function financialSnapshot(entity: SnapshotEntity) {
  const { pnl } = entity;
  const integrity = inspectFinancialIntegrity(pnl);
  const needsReview = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  return {
    revenue: pnl.isRevenueUnconfirmed ? '未確認' : `¥${pnl.monthlyRevenue.toLocaleString('ja-JP')}`,
    margin: pnl.isMarginUnconfirmed || pnl.monthlyRevenue <= 0 ? '未確認' : `${pnl.operatingMargin.toFixed(1)}%`,
    status: needsReview ? '数値の照合待ち' : pnl.financialStatus === 'VERIFIED' ? '台帳の確認区分: 一次確認' : `台帳の確認区分: ${pnl.financialStatus}`,
  };
}
