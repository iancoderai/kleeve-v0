import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { match, months } from './fill';
import { useLang } from './i18n';
import { F, Flame, Icon, ThemeButton, themed, useTheme } from './ui';

const SMART = [
  ['today', 'wb_sunny'],
  ['yesterday', 'history'],
  ['onthisday', 'event_repeat'],
  ['random', 'shuffle'],
];

export function Filters({ lib, albums, seen, onStart, oldest, onOldest, flame, onStreak, onSettings }) {
  const t = useTheme(), s = S(t), L = useLang();
  const data = useMemo(() => {
    if (!lib) return null;
    const now = new Date();
    const left = key => lib.reduce((n, a) => n + (!seen.has(a.id) && match(key, a.creationTime, now) ? 1 : 0), 0);
    return {
      all: left('all'),
      smart: Object.fromEntries(SMART.map(([k]) => [k, k === 'random' ? null : left(k)])),
      years: months(lib, seen),
      albums: (albums ?? []).map(a => ({ ...a, left: [...a.ids].reduce((n, id) => n + (seen.has(id) ? 0 : 1), 0) })),
    };
  }, [lib, albums, seen]);

  if (!data) return <View style={[s.root, s.center]}><ActivityIndicator color={t.text} /></View>;
  const go = (key, label) => onStart({ key, label, oldest });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.head}>
        <Text style={s.brand} accessibilityRole="header">
          Kleeve
        </Text>
        <View style={s.tools}>
          <Pressable
            style={[s.fire, flame.lit && s.fireLit]}
            onPress={onStreak}
            accessibilityRole="button"
            accessibilityLabel={L.streakA11y(flame.days, flame.lit)}
            hitSlop={4}>
            <View style={!flame.lit && s.dim}><Flame size={22} color={t.fire} /></View>
            <Text style={s.fireText}>{flame.days}</Text>
          </Pressable>
          <ThemeButton />
          <Pressable style={s.tool} onPress={onSettings} accessibilityRole="button" accessibilityLabel={L.settings} hitSlop={4}>
            <Icon name="settings" color={t.text} />
          </Pressable>
        </View>
      </View>

      <View style={s.seg} accessibilityRole="radiogroup">
        {[[false, L.newestFirst], [true, L.oldestFirst]].map(([k, label]) => (
          <Pressable
            key={label}
            onPress={() => onOldest(k)}
            style={[s.segBtn, oldest === k && s.segOn]}
            accessibilityRole="radio"
            accessibilityState={{ checked: oldest === k }}>
            <Text style={[s.segText, oldest === k && s.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={({ pressed }) => [s.hero, !data.all && s.dim, pressed && s.pressed]} onPress={() => go('all', L.everything)} disabled={!data.all}>
        <View style={s.flex}>
          <Text style={s.heroTitle}>{L.everything}</Text>
          <Text style={s.heroSub}>{data.all ? L.everythingSub(data.all, oldest) : L.caughtUp}</Text>
        </View>
        <View style={s.heroGo}><Icon name="arrow_forward" size={26} color={t.yellow} heavy /></View>
      </Pressable>

      <View style={s.grid}>
        {SMART.map(([k, icon], i) => {
          const label = L.smart[k], n = data.smart[k];
          const empty = n === 0 || (k === 'random' && !data.all);
          return (
            <Pressable
              key={k}
              style={({ pressed }) => [s.card, empty && s.dim, pressed && s.pressed]}
              onPress={() => go(k, label)}
              disabled={empty}
              accessibilityLabel={n != null ? `${label}, ${L.left(n)}` : label}>
              <View style={[s.badge, { backgroundColor: t.tiles[i] }]}><Icon name={icon} size={24} color={t.ink} /></View>
              <Text style={s.cardTitle}>{label}</Text>
              <Text style={s.cardSub}>{n == null ? L.randomOrder : n ? L.left(n) : L.nothingHere}</Text>
            </Pressable>
          );
        })}
      </View>

      {data.albums.length > 0 && (
        <>
          <Text style={s.year} accessibilityRole="header">{L.albums}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.albums}>
            {data.albums.map((a, i) => (
              <Pressable
                key={a.id}
                style={({ pressed }) => [s.album, !a.left && s.dim, pressed && s.pressed]}
                onPress={() => onStart({ key: 'album', ids: a.ids, label: a.title, oldest })}
                disabled={!a.left}
                accessibilityLabel={L.albumA11y(a.title, a.left)}>
                <View style={[s.badge, { backgroundColor: t.tiles[i % t.tiles.length] }]}><Icon name="folder" size={24} color={t.ink} /></View>
                <Text style={s.cardTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={s.cardSub}>{a.left ? L.left(a.left) : L.doneCheck}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {(oldest ? [...data.years].reverse() : data.years).map(y => (
        <View key={y.key}>
          <Pressable style={s.yearRow} onPress={() => go(y.key, `${y.year}`)} disabled={!y.left} accessibilityRole="button">
            <Text style={s.year}>{y.year}</Text>
            <Text style={s.yearAll}>{y.left ? L.reviewAll(y.left) : L.doneCheck}</Text>
          </Pressable>
          {(oldest ? [...y.months].reverse() : y.months).map(m => {
            const pct = (m.total - m.left) / m.total;
            return (
              <Pressable
                key={m.key}
                style={({ pressed }) => [s.month, !m.left && s.dim, pressed && s.pressed]}
                onPress={() => go(m.key, `${L.mon[m.month]} ${y.year}`)}
                disabled={!m.left}
                accessibilityLabel={L.monthA11y(L.mon[m.month], y.year, m.left, m.total)}>
                <View style={s.monthBody}>
                  <View style={s.monthTop}>
                    <Text style={s.monthName}>{L.mon[m.month]}</Text>
                    <Text style={s.monthCount}>{m.left ? L.left(m.left) : L.doneCheck}</Text>
                  </View>
                  <View style={s.track}>
                    <View style={[s.bar, { width: `${pct * 100}%` }]} />
                  </View>
                  <Text style={s.monthSub}>{L.monthSub(m.total, Math.round(pct * 100))}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

const S = themed(t => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  content: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 16, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  brand: { color: t.text, fontSize: 34, fontFamily: F[900], letterSpacing: -1 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tool: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  fire: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  fireLit: { borderColor: t.fire },
  fireText: { color: t.text, fontSize: 17, fontFamily: F[900] },
  seg: { flexDirection: 'row', backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 22, padding: 3 },
  segBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
  segOn: { backgroundColor: t.text },
  segText: { color: t.muted, fontSize: 14, fontFamily: F[700] },
  segTextOn: { color: t.bg },
  hero: {
    backgroundColor: t.yellow, borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 5, borderBottomColor: t.yellowSide,
  },
  heroTitle: { color: t.ink, fontSize: 30, fontFamily: F[900] },
  heroSub: { color: t.ink, opacity: 0.75, fontSize: 15, fontFamily: F[700], marginTop: 2 },
  heroGo: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: t.ink },
  bleed: { marginHorizontal: -16 },
  albums: { paddingHorizontal: 16, gap: 12 },
  album: { width: 150, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 24, padding: 16, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '47%', flexGrow: 1, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 24, padding: 16, gap: 4 },
  badge: { width: 44, height: 44, borderRadius: 14, backgroundColor: t.raised, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  cardTitle: { color: t.text, fontSize: 19, fontFamily: F[800] },
  cardSub: { color: t.muted, fontSize: 14, fontFamily: F[600] },
  yearRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingTop: 20, paddingBottom: 4, minHeight: 44 },
  year: { color: t.text, fontSize: 28, fontFamily: F[900] },
  yearAll: { color: t.muted, fontSize: 15, fontFamily: F[700] },
  month: { flexDirection: 'row', backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  monthBody: { flex: 1, padding: 16, gap: 8 },
  monthTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  monthName: { color: t.text, fontSize: 32, fontFamily: F[900], letterSpacing: -0.5 },
  monthCount: { color: t.text, fontSize: 16, fontFamily: F[700] },
  track: { height: 6, borderRadius: 3, backgroundColor: t.raised, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3, backgroundColor: t.accent },
  monthSub: { color: t.faint, fontSize: 13, fontFamily: F[600] },
  dim: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },
}));
