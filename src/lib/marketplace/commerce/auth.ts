import { verifyFirebaseIdToken } from '@/lib/firebase/server';

/**
 * 掲載・購入・紹介の API で使う利用者ID。認証できなければ null。
 * 手元の確認ではFirebaseエミュレーターのトークンが verifyFirebaseIdToken を通る（src/lib/firebase/emulator.ts）。
 * 認証を飛ばす裏口は作らない。
 */
export async function marketplaceUserId(request: Request): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(header.slice(7).trim()))?.uid ?? null;
}
