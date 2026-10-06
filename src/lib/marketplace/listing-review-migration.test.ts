import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { openFullTestDatabase } from './testing/sqlite-d1';

const MIGRATION = readFileSync(new URL('../../../migrations/d1/0016_listing_review.sql', import.meta.url), 'utf8');

describe('migration 0016 (listing review)', () => {
  it('turns existing published rows into pending_review and keeps every other row and inquiry', () => {
    const db = openFullTestDatabase(['0016_listing_review.sql']);
    db.prepare("INSERT INTO build_sessions(id,user_id,idea_id,status,build_spec,preview_access_token) VALUES('b1','u1','i1','ready','{}','tok')").run();
    const market = db.prepare(
      `INSERT INTO marketplace_listings(id,user_id,build_session_id,source_type,slug,title,category,product_url,status)
       VALUES(?,?,?,?,?,?,?,?,?)`,
    );
    market.run('m-pub', 'u1', null, 'external', 'm-pub', 'Pub', 'other', 'https://a.example/', 'published');
    market.run('m-draft', 'u1', null, 'external', 'm-draft', 'Draft', 'other', null, 'draft');
    market.run('m-builder', 'u1', 'b1', 'builder', 'm-builder', 'Builder', 'other', 'https://b.example/', 'published');
    const business = db.prepare(
      `INSERT INTO business_sale_listings(id,user_id,slug,title,category,established_year,monthly_revenue_jpy,monthly_profit_jpy,asking_price_jpy,status)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
    );
    for (const [id, status] of [['s-pub', 'published'], ['s-draft', 'draft'], ['s-closed', 'closed']] as const) {
      business.run(id, 'u1', id, `Biz ${id}`, 'saas', 2021, 100, 50, 1000, status);
    }
    db.prepare("INSERT INTO business_sale_inquiries(id,listing_id,buyer_user_id,message,contact_email) VALUES('q1','s-pub','buyer','十分な長さのメッセージです。','b@example.com')").run();

    db.exec(MIGRATION);

    const statuses = (table: string) => Object.fromEntries(
      (db.prepare(`SELECT id,status FROM ${table}`).all() as { id: string; status: string }[]).map((row) => [row.id, row.status]),
    );
    expect(statuses('marketplace_listings')).toEqual({ 'm-pub': 'pending_review', 'm-draft': 'draft', 'm-builder': 'pending_review' });
    expect(statuses('business_sale_listings')).toEqual({ 's-pub': 'pending_review', 's-draft': 'draft', 's-closed': 'closed' });
    expect(db.prepare("SELECT id,listing_id FROM business_sale_inquiries").all()).toEqual([{ id: 'q1', listing_id: 's-pub' }]);
    expect(db.prepare('SELECT review_note,reviewed_at,reviewed_by,revision FROM marketplace_listings WHERE id=?').get('m-pub'))
      .toEqual({ review_note: null, reviewed_at: null, reviewed_by: null, revision: 0 });

    // 新しい状態を受け付け、古い値と長すぎる理由は拒否する
    db.prepare("UPDATE business_sale_listings SET status='rejected',review_note='理由' WHERE id='s-pub'").run();
    expect(() => db.prepare("UPDATE business_sale_listings SET status='archived' WHERE id='s-pub'").run()).toThrow();
    expect(() => db.prepare("UPDATE marketplace_listings SET status='closed' WHERE id='m-pub'").run()).toThrow();
    expect(() => db.prepare("UPDATE marketplace_listings SET review_note=? WHERE id='m-pub'").run('あ'.repeat(201))).toThrow();

    // 連鎖削除と索引が作り直されている
    db.prepare("DELETE FROM business_sale_listings WHERE id='s-pub'").run();
    expect(db.prepare('SELECT COUNT(*) AS n FROM business_sale_inquiries').get()).toEqual({ n: 0 });
    const indexes = (db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE '%listings_%' OR name LIKE 'business_sale_inquiries_%'").all() as { name: string }[]).map((row) => row.name);
    expect(indexes).toEqual(expect.arrayContaining([
      'marketplace_listings_public', 'marketplace_listings_owner', 'business_sale_listings_public', 'business_sale_listings_owner', 'business_sale_inquiries_listing',
    ]));
    db.close();
  });

  it('can be applied to an empty database too', () => {
    const db = openFullTestDatabase();
    expect(db.prepare('SELECT COUNT(*) AS n FROM marketplace_listings').get()).toEqual({ n: 0 });
    db.close();
  });
});
