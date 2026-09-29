import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/components/marketplace/business/BusinessSaleEditor', () => ({
  BusinessSaleEditor: () => null,
}));

import { BusinessSaleEditor } from '@/components/marketplace/business/BusinessSaleEditor';
import NewBusinessSalePage from './page';

const call = (query: { id?: string | string[] }) => NewBusinessSalePage({ searchParams: Promise.resolve(query) });

describe('/marketplace/businesses/new', () => {
  it('opens an empty form for a new listing', async () => {
    const element = (await call({})) as React.ReactElement<{ listingId: string }>;
    expect(element.type).toBe(BusinessSaleEditor);
    expect(element.props.listingId).toBe('');
  });

  it('opens the given listing for editing', async () => {
    const id = '3f2b1c9e-0000-4000-8000-000000000001';
    const element = (await call({ id })) as React.ReactElement<{ listingId: string }>;
    expect(element.props.listingId).toBe(id);
  });

  it('answers not found for an id that cannot be a listing id', async () => {
    for (const id of ['', 'abc', 'X'.repeat(40), '../mine', ['a', 'b']]) {
      await expect(call({ id }), String(id)).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });
});
