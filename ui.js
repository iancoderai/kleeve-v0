import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import bold from 'expo-symbols/androidWeights/bold';
import Svg, { Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { LANGS, LangSet, useLang } from './i18n';

// Buzzer yellow + ember orange on soft ink (dark) or lavender paper (light); red/green stay for delete/keep.
const base = {
  red: '#FF4757', redSide: '#B3192A',
  green: '#1FBF75', greenSide: '#0E7A48',
  accent: '#FFC21A', accentSide: '#C28A00', onAccent: '#1E1606', // same yellow as the "Everything" button
  fire: '#FF8A1F',
  yellow: '#FFC21A', yellowSide: '#C28A00', ink: '#1E1606', // the "Everything" button
  tiles: ['#FFC21A', '#9D8BFF', '#FF6B7A', '#3DD6B0'], // Today, Yesterday, On this day, Shuffle
};
export const DARK = {
  ...base, dark: true,
  bg: '#0F0D18', card: '#1A1727', raised: '#26223A', line: '#302B47',
  text: '#F6F4FF', muted: '#A9A4C2', faint: '#726C8F', accentText: '#FFC21A',
  housing: '#25213A', rim: '#3A3456', scrim: 'rgba(0,0,0,0.6)',
};
export const LIGHT = {
  ...base, dark: false,
  bg: '#F6F4FD', card: '#FFFFFF', raised: '#ECE8FA', line: '#E3DEF5',
  text: '#17142A', muted: '#635E7E', faint: '#9893B2', accentText: '#8A6100', // yellow text is unreadable on white; deep gold passes contrast
  housing: '#DEDAF0', rim: '#C9C3E3', scrim: 'rgba(23,20,42,0.4)',
};

// Outfit, one family per weight (custom fonts ignore fontWeight on Android). Loaded in App via useFonts.
export const F = { 300: 'Outfit_300Light', 400: 'Outfit_400Regular', 600: 'Outfit_600SemiBold', 700: 'Outfit_700Bold', 800: 'Outfit_800ExtraBold', 900: 'Outfit_900Black' };

export const Theme = createContext(DARK);
export const useTheme = () => useContext(Theme);
export const ThemeToggle = createContext(() => {});
// Builds a file's styles once per palette: `const S = themed(t => StyleSheet.create(...))`, then `S(t)` in render.
export const themed = make => {
  const d = make(DARK), l = make(LIGHT);
  return t => (t.dark ? d : l);
};

// Material Symbols name (Android) -> SF Symbol (iOS).
const IOS = {
  close: 'xmark', check: 'checkmark', undo: 'arrow.uturn.backward',
  light_mode: 'sun.max.fill', dark_mode: 'moon.fill', settings: 'gearshape.fill',
  chevron_left: 'chevron.left', chevron_right: 'chevron.right', arrow_forward: 'arrow.right',
  play_arrow: 'play.fill', check_circle: 'checkmark.circle.fill', delete: 'trash.fill',
  workspace_premium: 'crown.fill', history: 'clock.arrow.circlepath', event_repeat: 'calendar',
  shuffle: 'shuffle', wb_sunny: 'sun.horizon.fill', restore: 'arrow.clockwise',
  photo_library: 'photo.on.rectangle', lock: 'lock.fill', folder: 'folder.fill',
};
export function Icon({ name, size = 22, color, heavy }) {
  return (
    <SymbolView
      name={{ android: name, ios: IOS[name], web: name }}
      size={size}
      tintColor={color}
      weight={heavy ? { ios: 'heavy', android: bold } : undefined}
    />
  );
}

// Streak icon: Heroicons "fire" (24 solid, MIT), https://heroicons.com
export function Flame({ size = 22, color }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path fillRule="evenodd" clipRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" />
    </Svg>
  );
}

// Sun/moon switch, top-right on every screen.
export function ThemeButton() {
  const t = useTheme(), L = useLang(), toggle = useContext(ThemeToggle);
  return (
    <Pressable
      style={[b.tool, { backgroundColor: t.card, borderColor: t.line }]}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={t.dark ? L.toLight : L.toDark}
      hitSlop={4}>
      <Icon name={t.dark ? 'light_mode' : 'dark_mode'} color={t.dark ? t.fire : t.text} />
    </Pressable>
  );
}

// Flag + native name for each language; used on the first onboarding slide and in Settings.
export function LangPicker() {
  const t = useTheme(), L = useLang(), set = useContext(LangSet);
  return (
    <View style={b.langs} accessibilityRole="radiogroup" accessibilityLabel={L.language}>
      {LANGS.map(([code, flag, name]) => {
        const on = L.code === code;
        return (
          <Pressable
            key={code}
            style={[b.lang, { backgroundColor: on ? t.raised : t.card, borderColor: on ? t.accent : t.line }]}
            onPress={() => set(code)}
            accessibilityRole="radio"
            accessibilityLabel={name}
            accessibilityState={{ checked: on }}>
            <Text style={b.flag}>{flag}</Text>
            <Text style={[b.langName, { color: on ? t.text : t.muted }]}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Game-show buzzer, seen from the front: a glossy dome on a metal plinth with a lit ring. Pressing squashes the dome.
// Drawn in a 100x90 box: plinth top ellipse at y=58, dome base rx 34.
export function Buzzer({ kind, icon, label, onPress, small }) {
  const t = useTheme();
  const [top, side] = { red: [t.red, t.redSide], green: [t.green, t.greenSide], accent: [t.accent, t.accentSide] }[kind];
  const [m1, m2, ring] = t.dark ? ['#4A4366', '#14111F', '#5A527A'] : ['#FFFFFF', '#BDB6DA', '#F2F0FA'];
  const w = small ? 66 : 112, h = w * 0.9;
  const dome = up => `M16 58 C16 ${58 - up} 84 ${58 - up} 84 58 A34 9 0 0 1 16 58 Z`;
  return (
    <View style={b.wrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} hitSlop={8}>
        {({ pressed }) => (
          <View style={{ width: w, height: h }}>
            <Svg width={w} height={h} viewBox="0 0 100 90">
              <Defs>
                <LinearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={m1} />
                  <Stop offset="1" stopColor={m2} />
                </LinearGradient>
                <RadialGradient id={`dome-${kind}`} cx="38%" cy="30%" r="75%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
                  <Stop offset="0.35" stopColor={top} />
                  <Stop offset="1" stopColor={side} />
                </RadialGradient>
              </Defs>
              <Path d="M6 58 V74 A44 10 0 0 0 94 74 V58 Z" fill="url(#metal)" />
              <Ellipse cx="50" cy="58" rx="44" ry="12" fill={ring} />
              <Ellipse cx="50" cy="58" rx="39" ry="10" fill={top} opacity={pressed ? 0.9 : 0.45} />
              <Ellipse cx="50" cy="58" rx="35.5" ry="9" fill={side} />
              <Path d={dome(pressed ? 30 : 46)} fill={`url(#dome-${kind})`} />
              <Ellipse cx="36" cy={pressed ? 44 : 36} rx="11" ry="5" fill="#fff" opacity="0.5" transform={`rotate(-18 36 ${pressed ? 44 : 36})`} />
            </Svg>
            <View style={[b.icon, { top: h * (pressed ? 0.44 : 0.36) }]} pointerEvents="none">
              <Icon name={icon} size={small ? 22 : 36} color="#fff" heavy />
            </View>
          </View>
        )}
      </Pressable>
      {label && !small && <Text style={[b.label, { color: t.muted }]}>{label}</Text>}
    </View>
  );
}

const b = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  tool: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  icon: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  label: { fontSize: 12, fontFamily: F[800], letterSpacing: 1.2, textTransform: 'uppercase' },
  langs: { flexDirection: 'row', gap: 8 },
  lang: { flex: 1, minHeight: 64, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 8 },
  flag: { fontSize: 26 },
  langName: { fontSize: 14, fontFamily: F[700] },
});
