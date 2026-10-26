import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Platform, Pressable, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { addListener, Album, Asset, AssetField, MediaType, Query, usePermissions } from 'expo-media-library';
import { File, Paths } from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image'; // animates GIFs on Android (RN Image doesn't)
import * as Notifications from 'expo-notifications';
import { bump, fill, match, streak } from './fill';
import { Filters } from './Filters';
import { Lang, LangSet, STRINGS, sysLang, useLang } from './i18n';
import { Access, Intro } from './Onboarding';
import { Settings } from './Settings';
import { Streak } from './Streak';
import { useFonts, Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black } from '@expo-google-fonts/outfit';
import { Buzzer, DARK, F, Flame, Icon, LIGHT, Theme, ThemeButton, ThemeToggle, themed, useTheme } from './ui';

// Decisions survive restarts (file keeps its pre-Kleeve name so existing data loads): `seen` = every reviewed id, `trash` = items waiting for the final confirmation.
const file = new File(Paths.document, 'buzzwipe.json');
let saved = { seen: [], trash: [], onboarded: false };
try { saved = JSON.parse(file.textSync()); } catch {}
saved.streak ??= { days: 0, last: 0 }; // files from before streaks lack it
const seen = new Set(saved.seen);
const fresh = () => ({ offset: 0, more: true, busy: false, ids: new Set() });
let cur = fresh(); // replaced on every filter change, so an in-flight fill for the old filter is ignored
const save = trash => { try { file.writeSync(JSON.stringify({ ...saved, seen: [...seen], trash })); } catch {} };
// ponytail: the filter screen reads the whole library's metadata each time it opens; past ~50k items, count per month with ranged Queries instead.
const scan = () => new Query()
  .within(AssetField.MEDIA_TYPE, [MediaType.IMAGE, MediaType.VIDEO])
  .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
  .exeForMetadata();
const time = a => a.creationTime ?? 0;
// Each album's ids, empty ones dropped. One Query at a time: firing them all in parallel can crash the native module on big libraries.
const albumsOf = async () => {
  const out = [];
  // Android returns one row per file (not per album), so dedupe first or this loop runs thousands of Queries.
  const all = [...new Map((await Album.getAlbumsMetadata()).map(m => [m.id, m])).values()];
  // iOS lists user albums only; smart ones (Screenshots, Videos, Favorites...) come separately.
  if (Platform.OS === 'ios') for (const a of await Album.getSmartAlbums().catch(() => [])) all.push({ id: a.id, title: await a.getTitle() });
  for (const m of all) {
    try {
      const r = await new Query().album(new Album(m.id)).within(AssetField.MEDIA_TYPE, [MediaType.IMAGE, MediaType.VIDEO]).exeForMetadata();
      if (r.length) out.push({ id: m.id, title: m.title, ids: new Set(r.map(a => a.id)) });
    } catch {}
  }
  return out.sort((a, b) => b.ids.size - a.ids.size); // biggest albums first
};
const size = b => (b >= 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`);
// Asked once, right after gallery access.
const ask = async L => {
  try {
    // eslint-disable-next-line import/namespace -- re-exported via `export *`, which the lint resolver misses
    await Notifications.setNotificationChannelAsync('streak', { name: L.channel, importance: Notifications.AndroidImportance.DEFAULT }); // must exist before the Android 13+ prompt
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!granted && canAskAgain) await Notifications.requestPermissionsAsync();
  } catch {}
};
// After the day's first review: one reminder tomorrow at 8 pm, replacing the previous one. Missing a day lets it lapse, no nagging.
const remind = async (days, L) => {
  try {
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = new Date();
    await Notifications.scheduleNotificationAsync({
      content: { title: L.remindTitle(days), body: L.remindBody },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 20), channelId: 'streak' },
    });
  } catch {}
};

export default function App() {
  const [perm, request, get] = usePermissions({ granularPermissions: ['photo', 'video'] });
  const [queue, setQueue] = useState([]);
  const [trash, setTrash] = useState(saved.trash);
  const [review, setReview] = useState(false);
  const [intro, setIntro] = useState(!saved.onboarded);
  const [opts, setOpts] = useState(null); // { key, label, oldest, list }; null = show the filter screen
  const [lib, setLib] = useState(null); // every photo/video's metadata, newest first
  const [albums, setAlbums] = useState(null); // [{ id, title, ids }]
  const [result, setResult] = useState(null); // the "space saved" screen after a delete
  const [history, setHistory] = useState([]); // decided items this session, newest last, for "Previous"
  const [fire, setFire] = useState(saved.streak);
  const [cheer, setCheer] = useState(false); // "N-day streak!" flash on the day's first review
  const [settings, setSettings] = useState(false);
  const [cal, setCal] = useState(false); // streak calendar, opened from the flame pill
  const [oldest, setOldest] = useState(!!saved.oldest); // sort order, remembered across visits and restarts
  const [fonts] = useFonts({ Outfit_300Light, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black });
  const sys = useColorScheme();
  const [mode, setMode] = useState(saved.theme); // 'light' | 'dark'; unset follows the system
  const t = (mode ?? sys) === 'light' ? LIGHT : DARK;
  const s = S(t);
  const [lang, setLangState] = useState(saved.lang ?? sysLang());
  const L = STRINGS[lang];
  // Limited access (Android 14+ / iOS 14+) would hide most of the library, so it counts as missing.
  const full = perm?.granted && perm.accessPrivileges !== 'limited';

  useEffect(() => {
    if (!full || saved.notifAsked) return;
    saved.notifAsked = true;
    save(trash);
    ask(L);
  }, [full, trash, L]);

  useEffect(() => { StatusBar.setBarStyle(t.dark ? 'light-content' : 'dark-content'); }, [t]);

  useEffect(() => {
    const c = cur;
    if (!full || !opts || queue.length >= 5 || c.busy || !c.more) return;
    c.busy = true;
    fill(async o => opts.list.slice(o, o + 200), c, seen)
      .then(items => c === cur && setQueue(q => q.concat(items))) // new array even when empty, so "All caught up" renders
      .finally(() => { c.busy = false; });
  }, [full, opts, queue.length]);

  // Bumped when the gallery changes (new photo, deletion elsewhere) or the app comes back, to trigger a rescan.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!full) return;
    let wait;
    // Android fires a burst of events per photo; wait for it to settle before rescanning.
    const sub = addListener(() => { clearTimeout(wait); wait = setTimeout(() => setTick(n => n + 1), 500); });
    return () => { clearTimeout(wait); sub.remove(); };
  }, [full]);

  // Re-read the library whenever the filter screen opens or the gallery changes, so counts reflect deletions and new photos.
  useEffect(() => {
    if (!full || opts) return;
    let live = true;
    scan().then(r => live && setLib(r), () => live && setLib([]));
    albumsOf().then(a => live && setAlbums(a), () => {});
    return () => { live = false; };
  }, [full, opts, tick]);

  // Save when leaving the app; re-check access and rescan when coming back (e.g. from Settings or the camera).
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active') return save(trash);
      get();
      setTick(n => n + 1);
    });
    return () => sub.remove();
  }, [trash, get]);

  const decide = (a, keep) => {
    if (seen.has(a.id)) return; // double tap
    seen.add(a.id);
    if (keep) saved.kept = (saved.kept ?? 0) + 1;
    else setTrash(t => [...t, a]);
    setQueue(q => q.filter(b => b !== a));
    setHistory(h => [...h, a]);
    const next = bump(fire);
    if (next !== fire) {
      saved.streak = next;
      setFire(next);
      setCheer(true);
      setTimeout(() => setCheer(false), 1800);
      remind(next.days, L);
    }
  };

  // Undo the last decision: the item goes back on top and out of the trash, nothing is deleted.
  const previous = () => {
    const a = history[history.length - 1];
    if (!a) return;
    seen.delete(a.id);
    if (!trash.some(b => b.id === a.id)) saved.kept--;
    setTrash(t => t.filter(b => b.id !== a.id));
    setQueue(q => [a, ...q]);
    setHistory(h => h.slice(0, -1));
  };

  const start = o => {
    const now = new Date();
    const list = o.ids ? lib.filter(a => o.ids.has(a.id)) : lib.filter(a => match(o.key, a.creationTime, now));
    if (o.key === 'random') {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    } else list.sort((a, b) => (o.oldest ? time(a) - time(b) : time(b) - time(a)));
    o.list = list;
    cur = fresh();
    setQueue([]);
    setHistory([]);
    setOpts(o);
  };

  const done = (gone, bytes, spared) => {
    saved.kept = (saved.kept ?? 0) + spared;
    if (gone.length) setResult({ label: opts?.label ?? '', kept: saved.kept ?? 0, gone: gone.length, bytes, total: (saved.freed = (saved.freed ?? 0) + bytes) });
    saved.kept = 0;
    gone.forEach(a => seen.delete(a.id));
    const ids = new Set(gone.map(a => a.id));
    setLib(l => l && l.filter(a => !ids.has(a.id))); // the filter screen may open before its rescan lands
    cur.offset = Math.max(0, cur.offset - gone.length); // deleted items sat above the cursor
    setHistory([]); // deleted items can't come back
    setTrash([]);
    save([]);
    setReview(false);
  };

  const finishIntro = () => {
    saved.onboarded = true;
    save(trash);
    setIntro(false);
  };

  const toggleTheme = () => {
    saved.theme = t.dark ? 'light' : 'dark';
    setMode(saved.theme);
    save(trash);
  };

  const setLang = c => {
    saved.lang = c;
    setLangState(c);
    save(trash);
  };

  const sortBy = o => {
    saved.oldest = o;
    setOldest(o);
    save(trash);
  };

  return (
    <Theme.Provider value={t}><ThemeToggle.Provider value={toggleTheme}>
      <Lang.Provider value={L}><LangSet.Provider value={setLang}>{screen()}</LangSet.Provider></Lang.Provider>
    </ThemeToggle.Provider></Theme.Provider>
  );

  function screen() {
  if (!perm || !fonts) return <View style={s.root} />;
  if (intro) return <Intro onDone={finishIntro} />;
  if (!full) return <Access perm={perm} request={request} />;
  if (result) return <Saved r={result} home={() => { setResult(null); setOpts(null); }} />;
  if (review) return <Review trash={trash} back={() => setReview(false)} done={done} />;
  if (settings) return <Settings onBack={() => setSettings(false)} />;
  if (cal) return <Streak fire={fire} onClose={() => setCal(false)} />;
  const flame = streak(fire);
  if (!opts) return <Filters lib={lib} albums={albums} seen={seen} onStart={start} oldest={oldest} onOldest={sortBy} flame={flame} onStreak={() => setCal(true)} onSettings={() => setSettings(true)} />;

  const top = queue[0];
  return (
    <View style={s.root}>
      <View style={s.bar}>
        <Pressable style={[s.pill, s.shrink]} onPress={() => setOpts(null)} accessibilityLabel={L.changeFilter}>
          <Icon name="chevron_left" size={20} color={t.text} />
          <Text style={s.label} numberOfLines={1}>{opts.label}{opts.key === 'random' ? '' : ` · ${opts.oldest ? L.oldest : L.newest}`}</Text>
        </Pressable>
        {trash.length > 0 && (
          <Pressable style={s.round} onPress={() => setReview(true)} accessibilityRole="button" accessibilityLabel={L.reviewN(trash.length)}>
            <Icon name="delete" size={20} color={t.red} />
            <View style={s.count}><Text style={s.countText}>{trash.length}</Text></View>
          </Pressable>
        )}
        <Pressable style={[s.pill, !flame.lit && s.dim]} onPress={() => setCal(true)} accessibilityRole="button" accessibilityLabel={L.streakA11y(flame.days, flame.lit)}>
          <Flame size={20} color={t.fire} />
          <Text style={s.label}>{flame.days}</Text>
        </Pressable>
        <ThemeButton />
      </View>
      <View style={s.stage}>
        {/* Phone-shaped frame: the whole photo fits inside, never cropped or tinted. */}
        <View style={s.frame}>
          {/* The next item renders underneath, so it is already decoded when the top one goes. */}
          {queue.slice(0, 2).reverse().map(a => (
            <Image key={a.id} source={{ uri: a.id }} style={s.fill} contentFit="contain" transition={0} />
          ))}
          {top?.video && <Clip key={top.id} id={top.id} />}
          {!top && (cur.more ? <ActivityIndicator color={t.text} /> : <Text style={s.msg}>{L.caughtUp}</Text>)}
        </View>
        {cheer && (
          <View style={s.cheer} pointerEvents="none" accessibilityLiveRegion="polite">
            <Flame size={72} color={t.fire} />
            <Text style={s.cheerText}>{L.cheer(flame.days)}</Text>
          </View>
        )}
      </View>
      {(top || history.length > 0) && (
        <View style={s.row}>
          {top && <Buzzer kind="red" icon="close" label={L.del} onPress={() => decide(top, false)} />}
          {history.length > 0 && (
            <Pressable style={s.undo} onPress={previous} accessibilityRole="button" accessibilityLabel={L.previous} hitSlop={8}>
              <Icon name="undo" size={26} color={t.text} heavy />
            </Pressable>
          )}
          {top && <Buzzer kind="green" icon="check" label={L.keep} onPress={() => decide(top, true)} />}
        </View>
      )}
    </View>
  );
  }
}

function Clip({ id }) {
  const player = useVideoPlayer(id, p => { p.loop = true; p.play(); });
  return <VideoView player={player} style={StyleSheet.absoluteFill} />;
}

// The re-confirmation: nothing is deleted until "Delete N" here (plus the OS prompt on iOS / Android 11+).
function Review({ trash, back, done }) {
  const t = useTheme(), s = S(t), L = useLang();
  const [spare, setSpare] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const doomed = trash.filter(a => !spare.has(a.id));
  const toggle = id => setSpare(p => { const n = new Set(p); if (!n.delete(id)) n.add(id); return n; });

  const purge = async () => {
    setBusy(true);
    // Sizes must be read before the files are gone. Android ids are content:// URIs File can size directly; the file:// path getUri gives is blocked by scoped storage.
    const sizeOf = async a => new File(a.id.startsWith('content://') ? a.id : await new Asset(a.id).getUri()).size ?? 0;
    const bytes = (await Promise.all(doomed.map(a => sizeOf(a).catch(() => 0)))).reduce((n, b) => n + b, 0);
    try {
      if (doomed.length) await Asset.delete(doomed.map(a => new Asset(a.id)));
    } catch {
      setBusy(false);
      return Alert.alert(L.nothingDeleted);
    }
    done(doomed, bytes, spare.size); // spared items stay reviewed, i.e. kept
  };

  return (
    <View style={s.root}>
      <Text style={s.title}>{L.deleteQ(doomed.length)}</Text>
      <Text style={s.hint}>{L.tapKeep}</Text>
      <FlatList
        data={trash}
        extraData={spare}
        numColumns={3}
        keyExtractor={a => a.id}
        renderItem={({ item: a }) => {
          const kept = spare.has(a.id);
          return (
            <Pressable
              style={s.cell}
              onPress={() => toggle(a.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={L.keep}
              accessibilityState={{ checked: kept }}>
              <Image source={{ uri: a.id }} style={[s.thumb, kept && s.dim]} />
              {a.video && <View style={s.badge}><Icon name="play_arrow" size={16} color="#fff" /></View>}
              {kept && <View style={s.kept}><Icon name="check_circle" size={26} color={t.green} /></View>}
            </Pressable>
          );
        }}
      />
      <View style={s.row}>
        <Pressable style={s.pill} onPress={back}>
          <Text style={s.label}>{L.back}</Text>
        </Pressable>
        <Pressable style={[s.pill, s.red]} onPress={purge} disabled={busy}>
          <Text style={[s.label, s.onRed]}>{doomed.length ? L.deleteN(doomed.length) : L.done}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Saved({ r, home }) {
  const t = useTheme(), s = S(t), L = useLang();
  return (
    <View style={[s.root, s.saved]}>
      <Text style={s.kicker}>{r.label.toUpperCase()}</Text>
      <Text style={s.big} accessibilityRole="header">{size(r.bytes)}</Text>
      <Text style={s.bigSub}>{L.saved}</Text>
      <View style={s.tiles}>
        <View style={[s.tile, { backgroundColor: t.green }]}><Text style={s.tileK}>{L.keptTile}</Text><Text style={s.tileN}>{r.kept}</Text></View>
        <View style={[s.tile, { backgroundColor: t.accent }]}><Text style={[s.tileK, { color: t.onAccent }]}>{L.deletedTile}</Text><Text style={[s.tileN, { color: t.onAccent }]}>{r.gone}</Text></View>
      </View>
      <Text style={s.hint}>{L.savedAllTime(size(r.total))}</Text>
      <Pressable style={({ pressed }) => [s.home, pressed && s.dim]} onPress={home} accessibilityRole="button">
        <Text style={s.homeText}>{L.home}</Text>
      </Pressable>
    </View>
  );
}

const S = themed(t => StyleSheet.create({
  // ponytail: fixed insets clear notches, Dynamic Island and 3-button nav; add react-native-safe-area-context if a device clips.
  root: { flex: 1, backgroundColor: t.bg, paddingTop: 64, paddingBottom: 48 },
  bar: { height: 44, paddingHorizontal: 16, flexDirection: 'row', gap: 8 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  frame: {
    height: '100%', aspectRatio: 9 / 19.5, borderRadius: 36, borderWidth: 1.5, borderColor: t.line, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: t.dark ? '#000' : t.card,
  },
  fill: { position: 'absolute', inset: 0, backgroundColor: t.dark ? '#000' : t.card },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingTop: 14, paddingHorizontal: 16 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 22, paddingHorizontal: 16, minHeight: 44 },
  shrink: { flexShrink: 1, marginRight: 'auto', paddingLeft: 10 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  count: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: t.red, alignItems: 'center', justifyContent: 'center' },
  countText: { color: '#fff', fontSize: 11, fontFamily: F[900] },
  undo: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  red: { backgroundColor: t.red, borderColor: t.red },
  label: { color: t.text, fontSize: 16, fontFamily: F[700], flexShrink: 1 },
  onRed: { color: '#fff' },
  msg: { color: t.text, fontSize: 17, fontFamily: F[700], textAlign: 'center', marginBottom: 24 },
  title: { color: t.text, fontSize: 28, fontFamily: F[900], paddingHorizontal: 16 },
  hint: { color: t.muted, fontSize: 15, fontFamily: F[400], paddingHorizontal: 16, paddingVertical: 8 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 1 },
  thumb: { flex: 1, backgroundColor: t.raised },
  dim: { opacity: 0.35 },
  cheer: { position: 'absolute', alignItems: 'center', backgroundColor: t.card, borderWidth: 2, borderColor: t.fire, borderRadius: 28, paddingHorizontal: 32, paddingVertical: 20 },
  cheerText: { color: t.fire, fontSize: 24, fontFamily: F[900] },
  badge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
  saved: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  kicker: { color: t.muted, fontSize: 15, fontFamily: F[900], letterSpacing: 1.5 },
  big: { color: t.text, fontSize: 56, fontFamily: F[900], letterSpacing: -1 },
  bigSub: { color: t.muted, fontSize: 20, fontFamily: F[700], marginTop: -8 },
  tiles: { flexDirection: 'row', gap: 12, marginVertical: 20, alignSelf: 'stretch' },
  tile: { flex: 1, borderRadius: 24, padding: 18, gap: 4 },
  tileK: { color: '#fff', fontSize: 13, fontFamily: F[900], letterSpacing: 1.2, opacity: 0.85 },
  tileN: { color: '#fff', fontSize: 40, fontFamily: F[900] },
  home: { alignSelf: 'stretch', height: 60, borderRadius: 30, marginTop: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.green, borderBottomWidth: 5, borderBottomColor: t.greenSide },
  homeText: { color: '#fff', fontSize: 18, fontFamily: F[900] },
  kept: { position: 'absolute', right: 6, top: 6, backgroundColor: '#fff', borderRadius: 13 },
}));
