// Pages newest-first through the library until `want` unreviewed items are found or it runs out.
// `page(offset)` resolves to asset metadata; `cur` = { offset, more, ids } persists between calls.
export async function fill(page, cur, seen, want = 10) {
  const out = [];
  while (out.length < want && cur.more) {
    const batch = await page(cur.offset);
    cur.offset += batch.length;
    cur.more = batch.length > 0;
    for (const a of batch) {
      if (seen.has(a.id) || cur.ids.has(a.id)) continue;
      cur.ids.add(a.id);
      out.push({ id: a.id, video: a.mediaType === 'video' });
    }
  }
  return out;
}

// Does an item taken at `t` (ms) belong to filter `key`?
// Keys: all, random, today, yesterday, onthisday (same date, earlier years), 'YYYY', 'YYYY-M' (1-based month).
export function match(key, t, now = new Date()) {
  if (key === 'all' || key === 'random') return true;
  if (t == null) return false;
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), at = new Date(t);
  const day = k => new Date(y, m, d + k).getTime();
  if (key === 'today') return t >= day(0);
  if (key === 'yesterday') return t >= day(-1) && t < day(0);
  if (key === 'onthisday') return at.getMonth() === m && at.getDate() === d && at.getFullYear() < y;
  const [ky, km] = key.split('-').map(Number);
  return at.getFullYear() === ky && (km == null || at.getMonth() === km - 1);
}

// Groups a newest-first library into years > months, each with total and unreviewed (`left`) counts.
export function months(lib, seen) {
  const years = [];
  for (const a of lib) {
    if (a.creationTime == null) continue;
    const at = new Date(a.creationTime), y = at.getFullYear(), m = at.getMonth();
    let yr = years[years.length - 1];
    if (yr?.year !== y) years.push(yr = { year: y, key: `${y}`, total: 0, left: 0, months: [] });
    let mo = yr.months[yr.months.length - 1];
    if (mo?.month !== m) yr.months.push(mo = { month: m, key: `${y}-${m + 1}`, total: 0, left: 0 });
    const left = seen.has(a.id) ? 0 : 1;
    yr.total++; mo.total++; yr.left += left; mo.left += left;
  }
  return years;
}

// Daily streak: `s` = { days, last, log, best } with `last` a local calendar day number. One review a day keeps it alive.
export const dayNo = now => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5;
// Every day with a review, for the calendar. Saves from before the log existed fall back to the current run.
export const logOf = s => s.log ?? Array.from({ length: s.days }, (_, i) => s.last - i);
// Count to show: 0 once a whole day was skipped. `lit` = already reviewed today.
export function streak(s, now = new Date()) {
  const d = dayNo(now);
  return { days: s.last >= d - 1 ? s.days : 0, lit: s.last === d };
}
// Call on every review; returns the same object if today already counted.
export function bump(s, now = new Date()) {
  const d = dayNo(now);
  if (s.last === d) return s;
  const days = s.last === d - 1 ? s.days + 1 : 1;
  return { days, last: d, log: [...logOf(s), d], best: Math.max(s.best ?? s.days, days) };
}
