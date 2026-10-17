import { StyleSheet, Text, View } from 'react-native';
import { Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

const BARS = [6, 14, 9, 18, 11, 15, 7, 12, 5];

export default function OnboardingScreen({ go }) {
  return (
    <>
      <View style={styles.body}>
        <Hero />
        <Text accessibilityRole="header" style={styles.headline}>
          You type. We make the call.
        </Text>
        <Text style={styles.lede}>
          Phone calls shouldn't stand between you and getting things fixed. Share a photo and a
          few words. Our AI assistant speaks to providers for you and brings back the best price.
        </Text>
      </View>
      <Footer>
        <PrimaryButton label="Get started" onPress={() => go('describe')} />
        <Text style={styles.note}>No sign-up. You never need to speak or answer a call.</Text>
      </Footer>
    </>
  );
}

function Hero() {
  return (
    <View
      style={styles.hero}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.blob} />
      <View style={styles.ring} />
      <View style={styles.dot} />
      <View style={styles.diamond} />

      <View style={styles.youBubble}>
        <View style={styles.row}>
          <View style={styles.aa}>
            <Text style={styles.aaText}>Aa</Text>
          </View>
          <Text style={styles.youLabel}>YOU TYPE</Text>
        </View>
        <Text style={styles.youText}>
          The pipe under my sink is leaking
          <Text style={{ color: colors.forest }}>|</Text>
        </Text>
      </View>

      <View style={styles.typing}>
        <View style={styles.typingDot} />
        <View style={[styles.typingDot, { opacity: 0.6 }]} />
        <View style={[styles.typingDot, { opacity: 0.3 }]} />
      </View>

      <View style={styles.aiBubble}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>AI</Text>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={styles.aiLabel}>WE SPEAK FOR YOU</Text>
          <View style={styles.wave}>
            {BARS.map((h, i) => (
              <View key={i} style={[styles.bar, { height: h }]} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.pill}>
        <View style={styles.online} />
        <Text style={styles.pillText}>Plumber on the line</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: 16, paddingHorizontal: 24 },
  headline: {
    ...font(800),
    marginTop: 32,
    fontSize: 36,
    lineHeight: 39,
    letterSpacing: -1.08,
    color: colors.ink,
  },
  lede: { ...font(400), marginTop: 16, fontSize: 17, lineHeight: 25, color: colors.body },
  note: { ...font(400), fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4 },

  hero: {
    height: 340,
    borderRadius: 24,
    backgroundColor: colors.mist,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blob: { width: 260, height: 260, borderRadius: 130, backgroundColor: colors.lime },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.forest,
    opacity: 0.25,
    right: -30,
    top: -30,
  },
  dot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.forest,
    left: 36,
    top: 44,
  },
  diamond: {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: colors.forest,
    right: 48,
    bottom: 56,
    transform: [{ rotate: '45deg' }],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  youBubble: {
    position: 'absolute',
    left: 24,
    top: 52,
    maxWidth: 200,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    transform: [{ rotate: '-4deg' }],
    boxShadow: '0 12px 28px rgba(22,51,0,0.14)',
  },
  aa: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aaText: { ...font(800), fontSize: 11, color: colors.forest },
  youLabel: { ...font(700), fontSize: 11, color: colors.muted, letterSpacing: 0.44 },
  youText: { ...font(600), fontSize: 15, lineHeight: 20, color: colors.ink },
  typing: { position: 'absolute', top: 162, flexDirection: 'row', gap: 6 },
  typingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forest },
  aiBubble: {
    position: 'absolute',
    right: 24,
    top: 192,
    backgroundColor: colors.forest,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    transform: [{ rotate: '3deg' }],
    boxShadow: '0 12px 28px rgba(22,51,0,0.22)',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { ...font(800), fontSize: 13, color: colors.forest },
  aiLabel: { ...font(700), fontSize: 11, color: colors.lime, letterSpacing: 0.44 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 18 },
  bar: { width: 3, borderRadius: 2, backgroundColor: colors.white },
  pill: {
    position: 'absolute',
    left: 36,
    bottom: 30,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0 8px 20px rgba(22,51,0,0.12)',
  },
  online: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.online },
  pillText: { ...font(700), fontSize: 13, color: colors.ink },
});
