import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bump, dayNo, fill, logOf, match, months, streak } from './fill.js';

test('fill skips reviewed and already-queued items, then stops at the end', async () => {
  const lib = Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, mediaType: i % 5 ? 'image' : 'video' }));
  const page = async o => lib.slice(o, o + 10);
  const cur = { offset: 0, more: true, ids: new Set() };
  const seen = new Set(['a0', 'a1', 'a7']);

  const first = await fill(page, cur, seen, 5);
  assert.deepEqual(first.map(a => a.id), ['a2', 'a3', 'a4', 'a5', 'a6', 'a8', 'a9']);
  assert.equal(first[3].video, true); // a5

  cur.offset = 3; // items above the cursor were deleted: re-reading must not duplicate
  const rest = await fill(page, cur, seen, 100);
  assert.deepEqual(rest.map(a => a.id), Array.from({ length: 15 }, (_, i) => `a${i + 10}`));
  assert.equal(cur.more, false);
});

test('match uses local calendar days, months and years', () => {
  const now = new Date(2026, 9, 23, 15, 30); // Fri Oct 23 2026
  const t = (...a) => new Date(...a).getTime();
  assert.ok(match('today', t(2026, 9, 23, 0, 1), now));
  assert.ok(!match('today', t(2026, 9, 22, 23, 59), now));
  assert.ok(match('yesterday', t(2026, 9, 22, 23, 59), now));
  assert.ok(!match('yesterday', t(2026, 9, 23), now));
  assert.ok(match('yesterday', t(2025, 11, 31, 12), new Date(2026, 0, 1)));
  assert.ok(match('onthisday', t(2023, 9, 23, 8), now));
  assert.ok(!match('onthisday', t(2026, 9, 23, 8), now)); // this year's is just "today"
  assert.ok(match('2026-9', t(2026, 8, 30), now));
  assert.ok(!match('2026-9', t(2026, 9, 1), now));
  assert.ok(match('2025', t(2025, 0, 1), now));
  assert.ok(!match('today', null, now));
  assert.ok(match('all', null, now));
});

test('months groups newest-first items with unreviewed counts', () => {
  const t = (...a) => new Date(...a).getTime();
  const lib = [
    { id: 'a', creationTime: t(2026, 9, 20) },
    { id: 'b', creationTime: t(2026, 9, 2) },
    { id: 'c', creationTime: t(2026, 8, 5) },
    { id: 'n', creationTime: null },
    { id: 'd', creationTime: t(2025, 11, 31) },
  ];
  const years = months(lib, new Set(['b']));
  assert.deepEqual(years.map(y => [y.key, y.total, y.left]), [['2026', 3, 2], ['2025', 1, 1]]);
  assert.deepEqual(years[0].months.map(m => [m.key, m.total, m.left]), [['2026-10', 2, 1], ['2026-9', 1, 1]]);
});

test('streak grows once per day, survives one idle day, resets after a skipped day', () => {
  let s = { days: 0, last: 0 };
  s = bump(s, new Date(2026, 9, 23, 9));
  assert.deepEqual(streak(s, new Date(2026, 9, 23, 22)), { days: 1, lit: true });
  assert.equal(bump(s, new Date(2026, 9, 23, 23)), s); // same day: no change
  s = bump(s, new Date(2026, 9, 24, 0, 5));
  assert.deepEqual(streak(s, new Date(2026, 9, 25, 23)), { days: 2, lit: false }); // still alive until tonight
  assert.deepEqual(streak(s, new Date(2026, 9, 26)), { days: 0, lit: false });
  assert.equal(bump(s, new Date(2026, 9, 26)).days, 1);
  s = bump({ days: 4, last: 0 }, new Date(2026, 2, 28)); // across a DST change and a month end
  s = bump(s, new Date(2026, 2, 29, 12));
  s = bump(s, new Date(2026, 2, 30, 12));
  s = bump(s, new Date(2026, 2, 31, 12));
  s = bump(s, new Date(2026, 3, 1, 12));
  assert.equal(s.days, 5);
  assert.equal(s.best, 5);
  assert.deepEqual(logOf(s).slice(-2).map(n => n - dayNo(new Date(2026, 3, 1))), [-1, 0]); // calendar days, DST-proof
  assert.equal(bump(s, new Date(2026, 3, 5)).best, 5); // a reset keeps the record
});
