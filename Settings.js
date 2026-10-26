import { useEffect, useState } from 'react';
import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLang } from './i18n';
import { F, Icon, LangPicker, ThemeButton, themed, useTheme } from './ui';

// ponytail: hardcoded store prices; read them from the billing SDK once RevenueCat / expo-iap is wired.
// Names and periods come from L.plans[id].
const PLANS = [
  { id: 'weekly', price: '$2.99', trial: 3 },
  { id: 'yearly', price: '$29.99', note: true },
];
// ponytail: placeholder legal pages; replace with live URLs before store submission.
const TERMS = 'https://kleeve.app/terms';
const PRIVACY = 'https://kleeve.app/privacy';

export function Settings({ onBack }) {
  const t = useTheme(), s = S(t), L = useLang();
  const [plan, setPlan] = useState(PLANS[0]);
  const per = p => L.plans[p.id][1];
  // ponytail: UI only, no billing yet; wire RevenueCat or expo-iap plus Play Console / App Store products.
  const notLive = () => Alert.alert(L.soonTitle, L.soonBody);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.top}>
        <Pressable style={s.round} onPress={onBack} accessibilityRole="button" accessibilityLabel={L.back} hitSlop={4}>
          <Icon name="chevron_left" color={t.text} />
        </Pressable>
        <Text style={[s.h1, s.flex]} accessibilityRole="header">{L.settings}</Text>
        <ThemeButton />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle} accessibilityRole="header">{L.language}</Text>
        <LangPicker />
      </View>

      <View style={s.pro}>
        <View style={s.crown}><Icon name="workspace_premium" size={30} color={t.onAccent} /></View>
        <Text style={s.kicker}>{L.pro}</Text>
        <Text style={s.headline}>{L.proHeadline}</Text>
        {L.benefits.map(b => (
          <View key={b} style={s.benefit}>
            <Icon name="check_circle" size={22} color={t.green} />
            <Text style={s.benefitText}>{b}</Text>
          </View>
        ))}

        <View style={s.plans} accessibilityRole="radiogroup">
          {PLANS.map(p => {
            const on = plan.id === p.id;
            return (
              <Pressable
                key={p.id}
                style={[s.plan, on && s.planOn]}
                onPress={() => setPlan(p)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}>
                <View style={[s.radio, on && s.radioOn]}>{on && <View style={s.dot} />}</View>
                <View style={s.flex}>
                  <Text style={s.planName}>{L.plans[p.id][0]}</Text>
                  <Text style={s.planSub}>{p.trial ? L.trial(p.trial) : L.billedYearly(p.price)}</Text>
                </View>
                <Text style={s.planPrice}>{p.price}<Text style={s.planPer}>/{per(p)}</Text></Text>
                {p.note && <View style={s.tag}><Text style={s.tagText}>{L.saveNote}</Text></View>}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={({ pressed }) => [s.cta, pressed && s.pressed]} onPress={notLive} accessibilityRole="button">
          <Text style={s.ctaText}>{plan.trial ? L.startTrial : L.subscribe}</Text>
        </Pressable>
        <Text style={s.fine}>
          {plan.trial ? L.fineTrial(plan.trial, plan.price, per(plan)) : L.fineSub(plan.price, per(plan))}
        </Text>
        <View style={s.links}>
          <Pressable onPress={notLive} hitSlop={8}><Text style={s.link}>{L.restore}</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(TERMS)} hitSlop={8}><Text style={s.link}>{L.terms}</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(PRIVACY)} hitSlop={8}><Text style={s.link}>{L.privacy}</Text></Pressable>
        </View>
      </View>

    </ScrollView>
  );
}

const S = themed(t => StyleSheet.create({
  root: { flex: 1, backgroundColor: t.bg },
  content: { paddingTop: 64, paddingBottom: 56, paddingHorizontal: 16, gap: 12 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card, borderWidth: 1, borderColor: t.line },
  h1: { color: t.text, fontSize: 30, fontFamily: F[900] },

  section: { backgroundColor: t.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: t.line, gap: 12 },
  sectionTitle: { color: t.text, fontSize: 19, fontFamily: F[800] },
  pro: { backgroundColor: t.card, borderRadius: 28, padding: 20, borderWidth: 2, borderColor: t.accent, gap: 10 },
  crown: { width: 52, height: 52, borderRadius: 16, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: t.accentText, fontSize: 13, fontFamily: F[900], letterSpacing: 1.5, marginTop: 6 },
  headline: { color: t.text, fontSize: 24, fontFamily: F[900], lineHeight: 30, marginBottom: 4 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  benefitText: { color: t.text, fontSize: 15, fontFamily: F[600], flex: 1 },
  plans: { gap: 10, marginTop: 8 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, borderRadius: 18, borderWidth: 2, borderColor: t.line, backgroundColor: t.bg },
  planOn: { borderColor: t.accent },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: t.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: t.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: t.accent },
  planName: { color: t.text, fontSize: 17, fontFamily: F[800] },
  planSub: { color: t.muted, fontSize: 13, fontFamily: F[600] },
  planPrice: { color: t.text, fontSize: 17, fontFamily: F[900] },
  planPer: { color: t.muted, fontSize: 13, fontFamily: F[600] },
  tag: { position: 'absolute', top: -10, right: 12, backgroundColor: t.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: '#fff', fontSize: 11, fontFamily: F[900] },
  cta: {
    marginTop: 8, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.accent, borderBottomWidth: 5, borderBottomColor: t.accentSide,
  },
  ctaText: { color: t.onAccent, fontSize: 18, fontFamily: F[900] },
  pressed: { transform: [{ translateY: 2 }], borderBottomWidth: 3 },
  fine: { color: t.muted, fontSize: 13, fontFamily: F[600], textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 },
  link: { color: t.muted, fontSize: 13, fontFamily: F[700], textDecorationLine: 'underline' },
}));
