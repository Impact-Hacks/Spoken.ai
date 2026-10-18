import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import TicTacToe from '../components/TicTacToe';
import { Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

// Dot colour per call status; anything unlisted (queued) uses the neutral border colour.
const DOT = { dialing: colors.lime, ringing: colors.lime, live: colors.online, 'wrapping-up': colors.lime, done: colors.forest };

const CALL_STATUS = {
  queued: 'Waiting',
  dialing: 'Dialing',
  ringing: 'Ringing',
  live: 'On the call',
  'wrapping-up': 'Wrapping up',
  done: 'Finished',
  failed: "Didn't connect",
};

export default function LoadingScreen({ state, go, startCalls }) {
  const { status, progress, message } = state.calls;

  if (status === 'error') {
    return (
      <>
        <View accessibilityLiveRegion="polite" style={styles.body}>
          <Text style={styles.title}>Calls didn't start</Text>
          <Text style={styles.text}>{message}</Text>
        </View>
        <Footer>
          <PrimaryButton label="Try again" onPress={startCalls} />
          <PrimaryButton variant="secondary" label="Back" onPress={() => go('summary')} />
        </Footer>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={styles.progress}>
        <Spinner />
        <Text style={styles.title}>Calling providers and comparing offers</Text>
        <Text style={styles.text}>
          This takes a few minutes. You can leave the app; your results will be here.
        </Text>
        {progress.length ? (
          <View style={styles.list}>
            {progress.map((c, i) => (
              <View key={c.n} style={[styles.row, i > 0 && styles.rowDivider]}>
                <View style={styles.rowStart}>
                  <View style={[styles.dot, { backgroundColor: DOT[c.status] || colors.border }]} />
                  <Text style={styles.rowLabel}>Provider {c.n}</Text>
                </View>
                <Text style={[styles.rowStatus, c.status === 'live' && { color: colors.forest }]}>
                  {CALL_STATUS[c.status] || c.status}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <TicTacToe />
    </ScrollView>
  );
}

function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />;
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', gap: 24 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, justifyContent: 'center', gap: 24 },
  progress: { alignItems: 'center', gap: 14 },
  spinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    marginBottom: 4,
    borderColor: colors.spinnerTrack,
    borderTopColor: colors.forest,
  },
  title: {
    ...font(700),
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.48,
    color: colors.ink,
    textAlign: 'center',
  },
  text: { ...font(400), fontSize: 15, lineHeight: 22, color: colors.body, textAlign: 'center' },
  list: {
    alignSelf: 'stretch',
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  rowStart: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowLabel: { ...font(400), fontSize: 15, color: colors.muted },
  rowStatus: { ...font(600), fontSize: 15, color: colors.ink },
});
