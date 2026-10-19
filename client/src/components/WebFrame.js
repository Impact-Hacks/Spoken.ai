import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, font } from '../theme';

// Below this width the browser gets the plain mobile layout, edge to edge.
const CARD_MIN = 640;
// From this width an intro panel sits beside the card.
const SIDE_MIN = 1040;

const STEPS = [
  ['Snap and describe', 'A photo and a few words about the problem and your budget.'],
  ['We make the calls', 'Our AI assistant phones local providers and asks for quotes.'],
  ['Pick the best offer', 'Compare prices and times side by side, then book in one tap.'],
];

/** Web only: shows the phone-sized app as a centred card on wide screens. Native renders children as is. */
export default function WebFrame({ children }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < CARD_MIN) return children;

  return (
    <View style={styles.page}>
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <View style={styles.row}>
        {width >= SIDE_MIN ? <Intro /> : null}
        <View style={[styles.card, { height: Math.min(height - 64, 860) }]}>{children}</View>
      </View>
    </View>
  );
}

function Intro() {
  return (
    <View style={styles.intro}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>S</Text>
        </View>
        <Text style={styles.brandText}>Spoken.ai</Text>
      </View>
      <Text accessibilityRole="header" style={styles.headline}>
        Get things fixed without picking up the phone.
      </Text>
      <View style={styles.steps}>
        {STEPS.map(([title, body], i) => (
          <View key={title} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowA: {
    position: 'absolute',
    width: 720,
    height: 720,
    borderRadius: 360,
    backgroundColor: colors.lime,
    opacity: 0.35,
    top: -320,
    left: -220,
    filter: 'blur(80px)',
  },
  glowB: {
    position: 'absolute',
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: colors.lime,
    opacity: 0.25,
    bottom: -280,
    right: -160,
    filter: 'blur(80px)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 72, paddingHorizontal: 32 },
  card: {
    width: 440,
    backgroundColor: colors.white,
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(22,51,0,0.06), 0 24px 60px rgba(22,51,0,0.16)',
  },
  intro: { width: 420, gap: 28 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { ...font(800), fontSize: 18, color: colors.lime },
  brandText: { ...font(800), fontSize: 20, letterSpacing: -0.4, color: colors.forest },
  headline: { ...font(800), fontSize: 44, lineHeight: 48, letterSpacing: -1.3, color: colors.ink },
  steps: { gap: 20 },
  step: { flexDirection: 'row', gap: 14 },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { ...font(700), fontSize: 14, color: colors.forest },
  stepTitle: { ...font(700), fontSize: 17, color: colors.ink },
  stepBody: { ...font(400), fontSize: 15, lineHeight: 22, color: colors.body },
});
