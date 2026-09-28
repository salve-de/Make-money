import type { SectorCategory } from '@/shared/terminal';

const SECTOR_LABELS: Record<SectorCategory, string> = {
  AI_AUTOMATION: 'AI・ソフトウェア',
  NICHE_SAAS: 'ソフトウェア',
  MONOPOLY_MFG: '製造',
  CONTENT_MEDIA: 'メディア',
  PHYSICAL_ASSET: '実物・店舗',
  FINTECH_INFRA: 'ITサービス',
  LOCAL_SERVICES: '地域サービス',
  UNKNOWN: '分類未確認',
};

export function sectorLabel(sector: SectorCategory): string {
  return SECTOR_LABELS[sector];
}
