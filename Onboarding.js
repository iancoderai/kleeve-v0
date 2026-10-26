import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useLang } from './i18n';
import { Buzzer, F, Icon, LangPicker, ThemeButton, themed, useTheme } from './ui';

const FILES = 1284;
const FREED = '3 GB';
// Little landscape "photos" for the illustrations: [sky, far hills, near hills, sun]. Every 4th one is a video.
const SCENES = [
  ['#FFD3A5', '#F28C6B', '#B8475E', '#FFF3C4'],
  ['#9FD8FF', '#5BA4E6', '#2E6FB8', '#FFE27A'],
  ['#CDEBC0', '#6DBE7A', '#2F7D4F', '#FFF6B0'],
  ['#23264A', '#3D4280', '#171A38', '#F4F1C9'],
  ['#FFE6B8', '#F2B25C', '#C9733A', '#FFFFFF'],
  ['#E3D7FF', '#A88BFF', '#6A4FD6', '#FFFFFF'],
  ['#FFC1D6', '#FF7AA2', '#C2416E', '#FFF0B3'],
  ['#B8F1E6', '#3FC1A5', '#1F7F6E', '#FFFFFF'],
  ['#2B1E4A', '#7C5CFF', '#3A2A78', '#FFB020'],
];
const POINTS = ['photo_library', 'lock', 'delete']; // icons for L.points
const SLIDES = [CheckArt, BuzzArt, SpaceArt]; // art for L.slides

export function Intro({ onDone }) {
  const s = S(useTheme()), L = useLang();
  const [i, setI] = useState(0);
  const [fade] = useState(() => new Animated.Value(1));
  const busy = useRef(false);
  const [title, body] = L.slides[i], Art = SLIDES[i];

  const next = () => {
    if (busy.current) return;
    if (i === SLIDES.length - 1) return onDone();
    busy.current = true;
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setI(i + 1);
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => { busy.current = false; });
    });
  };

  return (
    <View style={s.intro}>
      <Animated.View style={[s.slide, { opacity: fade }]}>
        <View style={s.art}><Art key={i} /></View>
        <Text style={s.title} accessibilityRole="header">{title}</Text>
        <Text style={s.body}>{body}</Text>
        {i === 0 && (
          <View style={s.langBox}>
            <Text style={s.langLabel}>{L.chooseLanguage}</Text>
            <LangPicker />
          </View>
        )}
      </Animated.View>
      <View style={s.corner}><ThemeButton /></View>
      <View style={s.dots}>
        {SLIDES.map((_, k) => <View key={k} style={[s.dot, k === i && s.dotOn]} />)}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={next}
        style={({ pressed }) => [s.pill, pressed && s.pressed]}>
        <Text style={s.pillText}>{L.continue}</Text>
      </Pressable>
    </View>
  );
}

// Permission gate: first ask, and again whenever access is missing or limited to a few files.
export function Access({ perm, request }) {
  const t = useTheme(), s = S(t), L = useLang();
  const [limited, setLimited] = useState(false);

  const go = async () => {
    if (perm.accessPrivileges === 'limited') return setLimited(true);
    if (!perm.canAskAgain) return Linking.openSettings();
    const r = await request();
    if (r.accessPrivileges === 'limited') setLimited(true);
  };

  return (
    <View style={s.access}>
      <View style={s.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={s.stack}>
          <Photo scene={6} style={[s.heroPhoto, { transform: [{ translateX: -70 }, { rotate: '-12deg' }] }]} />
          <Photo scene={1} style={[s.heroPhoto, { transform: [{ translateX: 70 }, { rotate: '12deg' }] }]} />
          <Photo scene={0} style={[s.heroPhoto, s.heroFront]} />
          <View style={[s.chip, s.chipDel]}><Icon name="close" size={22} color="#fff" heavy /></View>
          <View style={[s.chip, s.chipKeep]}><Icon name="check" size={22} color="#fff" heavy /></View>
        </View>
      </View>
      <Text style={s.hello} accessibilityRole="header">{L.welcome} <Text style={s.helloBrand}>Kleeve</Text></Text>
      <Text style={s.helloSub}>{L.tagline}</Text>
      <View style={s.points}>
        {POINTS.map((icon, k) => (
          <View key={icon} style={s.point}>
            <View style={s.pointIcon}><Icon name={icon} size={20} color={t.accentText} /></View>
            <Text style={s.pointText}>{L.points[k]}</Text>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={go} style={({ pressed }) => [s.pill, pressed && s.pressed]}>
        <Text style={s.pillText}>{L.allowAccess}</Text>
      </Pressable>
      <Text style={s.fineprint}>{L.needAccess}</Text>
      <View style={s.corner}><ThemeButton /></View>

      <Modal transparent statusBarTranslucent visible={limited} animationType="fade" onRequestClose={() => setLimited(false)}>
        <View style={s.scrim}>
          <View style={s.dialog}>
            <Text style={s.dialogTitle}>{L.fullTitle}</Text>
            <Text style={s.dialogBody}>{L.fullBody}</Text>
            <Pressable accessibilityRole="button" onPress={Linking.openSettings} style={s.dialogBtn}>
              <Text style={s.dialogBtnText}>{L.openSettings}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function useLoop(build) {
  const [v] = useState(() => new Animated.Value(0));
  const [anim] = useState(() => Animated.loop(build(v)));
  useEffect(() => { anim.start(); return () => anim.stop(); }, [anim]);
  return v;
}

// An illustrated landscape "photo" (sky, sun, two hills), so the art looks like a real gallery.
function Photo({ scene, video, style }) {
  const s = S(useTheme());
  const [sky, far, near, sun] = SCENES[scene];
  return (
    <View style={[s.photo, style]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 60 76" preserveAspectRatio="xMidYMid slice">
        <Rect width="60" height="76" fill={sky} />
        <Circle cx={scene % 2 ? 16 : 44} cy="20" r="8" fill={sun} />
        <Path d="M0 56 L18 34 L32 50 L42 40 L60 58 V76 H0 Z" fill={far} />
        <Path d="M0 64 Q20 52 36 62 T60 60 V76 H0 Z" fill={near} />
      </Svg>
      {video && <View style={s.photoPlay}><Icon name="play_arrow" size={18} color="#fff" /></View>}
    </View>
  );
}

function FileCard({ style, children }) {
  const s = S(useTheme());
  return (
    <Animated.View style={[s.card, style]}>
      {SCENES.map((_, k) => <Photo key={k} scene={k} video={k % 4 === 1} style={s.tile} />)}
      {children}
    </Animated.View>
  );
}

function CheckArt() {
  const s = S(useTheme());
  const v = useLoop(v => Animated.sequence([
    Animated.delay(400),
    Animated.spring(v, { toValue: 1, friction: 5, useNativeDriver: true }),
    Animated.delay(1400),
    Animated.timing(v, { toValue: 0, duration: 250, useNativeDriver: true }),
  ]));
  return (
    <FileCard>
      <View style={s.over}>
        <Animated.View style={[s.check, { opacity: v, transform: [{ scale: v }] }]}>
          <Icon name="check" size={88} color="#fff" heavy />
        </Animated.View>
      </View>
    </FileCard>
  );
}

function BuzzArt() {
  const s = S(useTheme());
  return (
    <View style={s.center}>
      <FileCard />
      <View style={s.buzzers} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Buzzer kind="red" icon="close" small />
        <Buzzer kind="green" icon="check" small />
      </View>
    </View>
  );
}

// Storage bar drains while the file count ticks down, then a "success" beat, on repeat.
function SpaceArt() {
  const t = useTheme(), s = S(t), L = useLang();
  const [v] = useState(() => new Animated.Value(0));
  const [n, setN] = useState(FILES);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const id = v.addListener(({ value }) => setN(Math.round(FILES * (1 - value))));
    let timer;
    const run = () => {
      setDone(false);
      v.setValue(0);
      Animated.timing(v, { toValue: 1, duration: 2600, delay: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: false })
        .start(({ finished }) => {
          if (!finished) return;
          setDone(true);
          timer = setTimeout(run, 2200);
        });
    };
    run();
    return () => { clearTimeout(timer); v.stopAnimation(); v.removeListener(id); };
  }, [v]);

  if (done) {
    return (
      <View style={s.center}>
        <Text style={s.success}>{L.allClean}</Text>
        <View style={s.savedRow}>
          <Text style={s.saved}><Text style={s.bold}>{FREED}</Text> {L.freedUp}</Text>
          <View style={s.tick}><Icon name="check" size={26} color="#fff" heavy /></View>
        </View>
      </View>
    );
  }
  return (
    <View style={s.center}>
      <View style={[s.card, s.back, { transform: [{ rotate: '-7deg' }] }]} />
      <View style={[s.card, s.back, { transform: [{ rotate: '5deg' }], backgroundColor: t.green }]} />
      <View style={[s.card, s.front]}>
        <View style={s.battery}>
          <Animated.View style={[s.charge, { width: v.interpolate({ inputRange: [0, 1], outputRange: [132, 14] }) }]} />
        </View>
        <Text style={s.count}>{n.toLocaleString()}</Text>
        <Text style={s.countLabel}>{L.toGo}</Text>
      </View>
    </View>
  );
}

const S = themed(t => StyleSheet.create({
  intro: { flex: 1, backgroundColor: t.bg, paddingTop: 64, paddingBottom: 56, paddingHorizontal: 20 },
  slide: { flex: 1 },
  corner: { position: 'absolute', top: 56, right: 20 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: F[900], color: t.text, textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 17, fontFamily: F[600], color: t.muted, textAlign: 'center', lineHeight: 24, minHeight: 72 },
  langBox: { gap: 10, marginTop: 8 },
  langLabel: { fontSize: 13, fontFamily: F[800], color: t.faint, textAlign: 'center', letterSpacing: 1.2, textTransform: 'uppercase' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.line },
  dotOn: { width: 18, backgroundColor: t.accent },
  pill: { backgroundColor: t.yellow, borderRadius: 40, height: 64, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 5, borderBottomColor: t.yellowSide },
  pillText: { fontSize: 18, fontFamily: F[900], color: t.ink },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  card: {
    width: 204, height: 250, borderRadius: 24, backgroundColor: t.card, padding: 8, borderWidth: 1, borderColor: t.line,
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, overflow: 'hidden', boxShadow: '0 12px 24px rgba(0,0,0,0.25)',
  },
  tile: { width: 58, height: 74 },
  photo: { borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photoPlay: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  over: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  check: { width: 170, height: 170, borderRadius: 85, backgroundColor: t.green, opacity: 0.95, alignItems: 'center', justifyContent: 'center' },
  buzzers: { flexDirection: 'row', gap: 40, marginTop: 28 },

  back: { position: 'absolute', backgroundColor: t.accent },
  front: { backgroundColor: t.dark ? t.raised : '#26223A', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' },
  battery: { width: 150, height: 56, borderRadius: 14, borderWidth: 5, borderColor: '#fff', padding: 4, justifyContent: 'center' },
  charge: { height: '100%', borderRadius: 6, backgroundColor: t.fire },
  count: { color: '#fff', fontSize: 40, fontFamily: F[300], marginTop: 12 },
  countLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: F[400] },
  success: { color: t.accentText, fontSize: 56, fontFamily: F[900], letterSpacing: 1 },
  bold: { fontFamily: F[900] },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  saved: { color: t.text, fontSize: 26, fontFamily: F[400], letterSpacing: 1 },
  tick: { width: 44, height: 44, borderRadius: 22, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' },

  access: { flex: 1, backgroundColor: t.bg, paddingTop: 72, paddingBottom: 48, paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  stack: { width: 300, height: 230, alignItems: 'center', justifyContent: 'center' },
  heroPhoto: { position: 'absolute', width: 128, height: 164, borderRadius: 22, borderWidth: 4, borderColor: t.card, boxShadow: '0 14px 28px rgba(0,0,0,0.25)' },
  heroFront: { width: 148, height: 190 },
  chip: { position: 'absolute', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: t.bg },
  chipDel: { backgroundColor: t.red, left: 28, bottom: 0 },
  chipKeep: { backgroundColor: t.green, right: 28, top: 0 },
  hello: { color: t.text, fontSize: 38, fontFamily: F[800], textAlign: 'center', lineHeight: 46, letterSpacing: -0.5, marginTop: 24 },
  helloBrand: { color: t.accentText, fontFamily: F[900] },
  helloSub: { color: t.muted, fontSize: 17, fontFamily: F[400], textAlign: 'center', lineHeight: 24, marginTop: 8 },
  points: { backgroundColor: t.card, borderWidth: 1, borderColor: t.line, borderRadius: 24, padding: 16, gap: 14, marginVertical: 24 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: t.raised, alignItems: 'center', justifyContent: 'center' },
  pointText: { color: t.text, fontSize: 15, fontFamily: F[600], flex: 1 },
  fineprint: { color: t.faint, fontSize: 13, fontFamily: F[400], textAlign: 'center', marginTop: 12 },

  scrim: { flex: 1, backgroundColor: t.scrim, alignItems: 'center', justifyContent: 'center', padding: 32 },
  dialog: { backgroundColor: t.card, borderRadius: 28, padding: 28, width: '100%' },
  dialogTitle: { fontSize: 24, fontFamily: F[800], color: t.text, marginBottom: 16 },
  dialogBody: { fontSize: 15, fontFamily: F[400], color: t.muted, lineHeight: 22, marginBottom: 24 },
  dialogBtn: { alignSelf: 'flex-end', backgroundColor: t.green, borderRadius: 24, paddingHorizontal: 26, paddingVertical: 12 },
  dialogBtnText: { fontSize: 16, fontFamily: F[800], color: '#fff' },
}));
