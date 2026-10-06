'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase/client';
import { useCompareTray } from '@/platform/hooks/useCompareTray';
import { compareHref } from '@/platform/model/compare-ids';
import { buildMenuItems, type AccountMenuState, type MenuItem } from './navigationItems';

/** PC の「その他」とスマホの引き出しメニューに出す項目（同じ並び）。ログイン状態・比較に入れた件数・保存件数を反映する */
export function useMenuItems(bookmarkCount?: number): MenuItem[] {
  const { user, loading } = useAuth();
  const { items: compareItems } = useCompareTray();
  const account: AccountMenuState = !auth || loading ? 'hidden' : user ? 'signedIn' : 'signedOut';
  return useMemo(() => {
    const ids = compareItems.map((item) => item.id);
    return buildMenuItems({ account, compareIds: ids, compareHref: compareHref(ids), bookmarkCount });
  }, [account, compareItems, bookmarkCount]);
}
