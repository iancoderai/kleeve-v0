import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { dayNo, logOf, streak } from './fill';
import { useLang } from './i18n';
import { F, Flame, Icon, themed, useTheme } from './ui';

// Opened from the flame pill: current run, a month calendar with every reviewed day lit, and the record.
export function Streak({ fire, onClose }) {
  const t = useTheme(), s = S(t), L = useLang();
  const now = new Date(), today = dayNo(now);
  const [at, setAt] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const lit = useMemo(() => new Set(logOf(fire)), [fire]);
  const { days } = streak(fire, now);
  const best = Math.max(fire.best ?? 0, fire.days);
  const y = at.getFullYear(), m = at.getMonth();
  const isNow = y === now.getFullYear() && m === now.getMonth();
  const cells = [...Array(new Date(y, m, 1).getDay()).fill(null), ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => i + 1)];
  const shift = k => setAt(new Date(y, m + k, 1));

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Pressable style={s.close} onPress={onClose} accessibilityRole="button" accessibilityLabel={L.close} hitSlop={4}>
        <Icon name="close" color={t.text} />
      </Pressable>

      <View style={s.hero} accessible accessibilityLabel={L.streakN(days)}>
        <View style={s.flex}>
          <Text style={s.num}>{days}</Text>
          <Text style={s.unit}>{L.dayStreak(days)}</Text>
        </View>
        <Flame size={96} color={t.fire} />
      </View>

      <View style={s.card}>
        <View style={s.monthRow}>
          <Text style={s.month} accessibilityRole="header">{L.mon[m]} ’{String(y).slice(2)}</Text>
          <Pressable style={s.nav} onPress={() => shift(-1)} accessibilityLabel={L.prevMonth} hitSlop={4}>
            <Icon name="chevron_left" color={t.text} />
          </Pressable>
          <Pressable style={[s.nav, isNow && s.dim]} onPress={() => shift(1)} disabled={isNow} accessibilityLabel={L.nextMonth} hitSlop={4}>
            <Icon name="chevron_right" color={t.text} />
          </Pressable>
        </View>
        <View style={s.grid}>
          {L.week.map((w, i) => <Text key={i} style={[s.cell, s.week]}>{w}</Text>)}
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={s.cell} />;
            const n = dayNo(new Date(y, m, d)), on = lit.has(n);
            return (
              <View key={i} style={s.cell} accessible accessibilityLabel={`${L.mon[m]} ${d}${on ? L.reviewed : ''}`}>
                <View style={[s.dot, on && s.on, n === today && !on && s.today]}>
                  <Text style={[s.day, on && s.dayOn, n > today && s.future]}>{d}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.best}>
        <Flame size={22} color={t.fire} />
        <Text style={s.bestText}>{L.best(best)}</Text>
      </View>
    </ScrollView>
  );
}

const S = themed(t => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 16, gap: 16 },
  flex: { flex: 1 },
  close: { alignSelf: 'flex-end', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  hero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  num: { color: t.fire, fontSize: 96, fontFamily: F[900], lineHeight: 100, letterSpacing: -3 },
  unit: { color: t.text, fontSize: 28, fontFamily: F[800], marginTop: -4 },
  card: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 24, padding: 16, gap: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  month: { flex: 1, color: t.text, fontSize: 26, fontFamily: F[900] },
  nav: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.raised },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  week: { color: t.faint, fontSize: 13, fontFamily: F[700], textAlign: 'center', textAlignVertical: 'center' },
  dot: { width: '84%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: t.fire },
  today: { borderWidth: 2, borderColor: t.fire },
  day: { color: t.text, fontSize: 16, fontFamily: F[700] },
  dayOn: { color: t.ink, fontFamily: F[900] },
  future: { color: t.faint },
  dim: { opacity: 0.3 },
  best: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  bestText: { color: t.muted, fontSize: 17, fontFamily: F[800] },
}));
