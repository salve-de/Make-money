import { queryD1, type D1Statement } from '@/lib/storage/d1';

/**
 * 退会（DELETE /api/user/me）で消す、事業の売買のデータ。
 * - 自分の掲載
 * - 自分の掲載に届いた問い合わせ（買い手の連絡先・本文を含む）
 * - 自分が他の掲載へ送った問い合わせ（連絡先・本文を含む）
 * 外部キーの連鎖削除に頼らず、問い合わせを先に明示して消す。
 */
export function businessSaleDeletionStatements(userId: string): D1Statement[] {
  return [
    {
      sql: 'DELETE FROM business_sale_inquiries WHERE buyer_user_id = ? OR listing_id IN (SELECT id FROM business_sale_listings WHERE user_id = ?)',
      params: [userId, userId],
    },
    { sql: 'DELETE FROM business_sale_listings WHERE user_id = ?', params: [userId] },
  ];
}

/** 削除後の読み戻し。本人の掲載か、本人が送った問い合わせが1件でも残っていれば true。 */
export async function businessSaleDataRemains(userId: string): Promise<boolean> {
  const [row] = await queryD1<{ total: number }>(
    'SELECT (SELECT COUNT(*) FROM business_sale_listings WHERE user_id = ?) + (SELECT COUNT(*) FROM business_sale_inquiries WHERE buyer_user_id = ?) AS total',
    [userId, userId],
  );
  return !row || Number(row.total) !== 0;
}
