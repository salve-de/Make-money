import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CLAIM_SEND_SQL, LOAD_SENT_SQL, RELEASE_SEND_SQL } from '@/lib/notifications/ledger';
import { DELETE_SUBSCRIBER_SQL, LIST_ALERT_SEARCHES_SQL, LIST_SUBSCRIBERS_SQL } from '@/lib/notifications/recipients';
import {
  DELETE_SAVED_SEARCH_SQL,
  GET_SAVED_SEARCH_SQL,
  INSERT_SAVED_SEARCH_SQL,
  LIST_SAVED_SEARCHES_SQL,
  UPDATE_SAVED_SEARCH_SQL,
} from './store';

/**
 * The exact SQL the application sends, run against the real migrations in a real SQLite.
 * The unit tests elsewhere mock D1, so this is what proves the per-person cap, the owner
 * scoping and the once-only ledger actually hold in the database.
 */
const migrationsDirectory = fileURLToPath(new URL('../../../migrations/d1/', import.meta.url));

const SCENARIO = String.raw`
import json, sqlite3, sys
cfg = json.load(sys.stdin)
db = sqlite3.connect(':memory:')
db.row_factory = sqlite3.Row
for script in cfg['migrations']:
    db.executescript(script)
sql = cfg['sql']

def q(statement, params=()):
    rows = [dict(row) for row in db.execute(statement, params).fetchall()]
    db.commit()
    return rows

def rejected(statement, params):
    try:
        db.execute(statement, params)
        db.commit()
        return False
    except sqlite3.IntegrityError:
        return True

out = {}

# The cap is enforced by one statement: 22 attempts for one person, 20 rows, and another person is unaffected.
out['created'] = [len(q(sql['insert'], (f'a{i}', 'A', f'name{i}', '', '{}', 1, 1000 + i, 'A', 20))) for i in range(22)]
out['countA'] = q("SELECT COUNT(*) AS c FROM saved_searches WHERE user_id='A'")[0]['c']
out['createdForB'] = len(q(sql['insert'], ('b0', 'B', 'mine', '', '{}', 1, 2000, 'B', 20)))

# Nobody but the owner can read, change or delete a search, even knowing its id.
out['getOther'] = len(q(sql['get'], ('a0', 'B')))
out['getOwner'] = len(q(sql['get'], ('a0', 'A')))
out['updateOther'] = len(q(sql['update'], ('hijacked', 0, 'a0', 'B')))
out['deleteOther'] = len(q(sql['delete'], ('a1', 'B')))
out['afterAttack'] = q("SELECT name, notify FROM saved_searches WHERE id='a0'")[0]
out['rowsAfterAttack'] = q("SELECT COUNT(*) AS c FROM saved_searches WHERE id='a1'")[0]['c']

# The owner can change one field without touching the other (COALESCE), and deleting frees a slot.
out['renameOnly'] = len(q(sql['update'], ('renamed', None, 'a0', 'A')))
out['afterRename'] = q("SELECT name, notify FROM saved_searches WHERE id='a0'")[0]
out['muteOnly'] = len(q(sql['update'], (None, 0, 'a0', 'A')))
out['afterMute'] = q("SELECT name, notify FROM saved_searches WHERE id='a0'")[0]
out['deleteOwner'] = len(q(sql['delete'], ('a1', 'A')))
out['createAfterDelete'] = len(q(sql['insert'], ('a-new', 'A', 'again', '', '{}', 1, 3000, 'A', 20)))
out['createWhenFullAgain'] = len(q(sql['insert'], ('a-over', 'A', 'over', '', '{}', 1, 3001, 'A', 20)))
listed = q(sql['list'], ('A',))
out['listOrder'] = [row['id'] for row in listed[:3]]
out['listKeys'] = sorted(listed[0].keys())

# The database refuses out-of-range values even if the application check were bypassed.
insert_raw = "INSERT INTO saved_searches(id,user_id,name,query,filters,notify,created_at) VALUES(?,?,?,?,?,?,?)"
out['checks'] = {
    'name61': rejected(insert_raw, ('c1', 'C', 'あ' * 61, '', '{}', 1, 1)),
    'name60': not rejected(insert_raw, ('c2', 'C', 'あ' * 60, '', '{}', 1, 1)),
    'name0': rejected(insert_raw, ('c3', 'C', '', '', '{}', 1, 1)),
    'query201': rejected(insert_raw, ('c4', 'C', 'ok', 'x' * 201, '{}', 1, 1)),
    'query200': not rejected(insert_raw, ('c5', 'C', 'ok', 'x' * 200, '{}', 1, 1)),
    'badJson': rejected(insert_raw, ('c6', 'C', 'ok', '', '{', 1, 1)),
    'notify2': rejected(insert_raw, ('c7', 'C', 'ok', '', '{}', 2, 1)),
}

# The ledger: the first claim wins, a repeat is refused, another edition or kind is separate.
claims = [
    q(sql['claim'], ('s1', 'saved_search', 'h1', '20260929-09', 1)),
    q(sql['claim'], ('s2', 'saved_search', 'h1', '20260929-09', 2)),
    q(sql['claim'], ('s3', 'saved_search', 'h1', '20260929-15', 3)),
    q(sql['claim'], ('s4', 'newsletter', 'h1', '20260929-09', 4)),
    q(sql['claim'], ('s5', 'saved_search', 'h2', '20260929-09', 5)),
]
out['claims'] = [len(rows) for rows in claims]
out['loadSent'] = sorted(row['recipientHash'] for row in q(sql['loadSent'], ('saved_search', '20260929-09')))
q(sql['release'], ('saved_search', 'h1', '20260929-09'))
out['claimAfterRelease'] = len(q(sql['claim'], ('s6', 'saved_search', 'h1', '20260929-09', 6)))
out['ledgerRows'] = q("SELECT COUNT(*) AS c FROM notification_sends")[0]['c']
out['ledgerHasNoAddress'] = all('@' not in str(value) for row in q("SELECT * FROM notification_sends") for value in row.values())

# Who a digest may write to: real accounts with notify on. Muted searches are excluded and
# an account with no users row still appears, with a null address, so it can be skipped rather than guessed.
q("INSERT INTO users(id,email) VALUES('U1','one@mail.jp'),('U2','two@mail.jp')")
for row in [
    ('n1', 'U1', 'first', 1, 10), ('n2', 'U1', 'second', 1, 20), ('n3', 'U2', 'muted', 0, 30), ('n4', 'GHOST', 'orphan', 1, 40),
]:
    q(insert_raw, (row[0], row[1], row[2], '', '{}', row[3], row[4]))
alerts = q(sql['listAlert'])
out['alerts'] = [(row['userId'], row['email'], row['name']) for row in alerts if row['userId'] in ('U1', 'U2', 'GHOST')]

# Newsletter subscribers: only active ones, oldest first; deleting removes the row.
q("INSERT INTO newsletter_subscribers(id,email,source,status,subscribed_at) VALUES('ns1','a@mail.jp','web','active','2026-01-02'),('ns2','b@mail.jp','web','unsubscribed','2026-01-01'),('ns3','c@mail.jp','web','active','2026-01-01')")
out['subscribers'] = [row['id'] for row in q(sql['subscribers'])]
q(sql['deleteSubscriber'], ('ns3',))
out['subscribersAfterDelete'] = [row['id'] for row in q(sql['subscribers'])]

print(json.dumps(out, ensure_ascii=False))
`;

function runScenario() {
  const migrations = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(migrationsDirectory, file), 'utf8'));
  const run = spawnSync('python3', ['-c', SCENARIO], {
    input: JSON.stringify({
      migrations,
      sql: {
        insert: INSERT_SAVED_SEARCH_SQL,
        update: UPDATE_SAVED_SEARCH_SQL,
        delete: DELETE_SAVED_SEARCH_SQL,
        get: GET_SAVED_SEARCH_SQL,
        list: LIST_SAVED_SEARCHES_SQL,
        claim: CLAIM_SEND_SQL,
        release: RELEASE_SEND_SQL,
        loadSent: LOAD_SENT_SQL,
        listAlert: LIST_ALERT_SEARCHES_SQL,
        subscribers: LIST_SUBSCRIBERS_SQL,
        deleteSubscriber: DELETE_SUBSCRIBER_SQL,
      },
    }),
    encoding: 'utf8',
  });
  expect(run.status, run.stderr).toBe(0);
  return JSON.parse(run.stdout) as Record<string, unknown>;
}

describe('saved searches and the send ledger in a real SQLite', () => {
  let result: Record<string, unknown>;
  beforeAll(() => {
    result = runScenario();
  });

  it('applies every checked-in migration, including 0013, in order', () => {
    expect(result).toBeTruthy();
  });

  it('caps one person at 20 searches with a single statement and leaves other people alone', () => {
    const created = result.created as number[];
    expect(created.slice(0, 20).every((count) => count === 1)).toBe(true);
    expect(created.slice(20)).toEqual([0, 0]);
    expect(result.countA).toBe(20);
    expect(result.createdForB).toBe(1);
  });

  it('lets only the owner read, change or delete a search', () => {
    expect(result.getOther).toBe(0);
    expect(result.getOwner).toBe(1);
    expect(result.updateOther).toBe(0);
    expect(result.deleteOther).toBe(0);
    expect(result.afterAttack).toEqual({ name: 'name0', notify: 1 });
    expect(result.rowsAfterAttack).toBe(1);
  });

  it('changes one field at a time and frees a slot when a search is deleted', () => {
    expect(result.renameOnly).toBe(1);
    expect(result.afterRename).toEqual({ name: 'renamed', notify: 1 });
    expect(result.muteOnly).toBe(1);
    expect(result.afterMute).toEqual({ name: 'renamed', notify: 0 });
    expect(result.deleteOwner).toBe(1);
    expect(result.createAfterDelete).toBe(1);
    expect(result.createWhenFullAgain).toBe(0);
  });

  it('lists newest first with the columns the API maps', () => {
    expect((result.listOrder as string[])[0]).toBe('a-new');
    expect(result.listKeys).toEqual(['createdAt', 'filters', 'id', 'name', 'notify', 'query']);
  });

  it('refuses out-of-range values at the database as well', () => {
    expect(result.checks).toEqual({
      name61: true, name60: true, name0: true, query201: true, query200: true, badJson: true, notify2: true,
    });
  });

  it('lets exactly one caller claim an edition for a recipient, and releasing gives it back', () => {
    // same recipient+edition twice -> second refused; other edition, other kind and other recipient are separate
    expect(result.claims).toEqual([1, 0, 1, 1, 1]);
    expect(result.loadSent).toEqual(['h1', 'h2']);
    expect(result.claimAfterRelease).toBe(1);
    expect(result.ledgerRows).toBe(4);
  });

  it('stores no email address in the ledger', () => {
    expect(result.ledgerHasNoAddress).toBe(true);
  });

  it('lists notify-on searches with the stored address, and null when there is no account row', () => {
    expect(result.alerts).toEqual([
      ['GHOST', null, 'orphan'],
      ['U1', 'one@mail.jp', 'first'],
      ['U1', 'one@mail.jp', 'second'],
    ]);
  });

  it('lists only active newsletter subscribers, oldest first, and deleting removes the row', () => {
    expect(result.subscribers).toEqual(['ns3', 'ns1']);
    expect(result.subscribersAfterDelete).toEqual(['ns1']);
  });
});
