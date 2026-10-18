import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

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
    <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={styles.body}>
      <Spinner />
      <Text style={styles.title}>Calling providers and comparing offers</Text>
      <Text style={styles.text}>
        This usually takes a few minutes. You can leave the app — we'll keep going and your
        results will be here.
      </Text>
      {progress.length ? (
        <View style={styles.list}>
          {progress.map((c) => (
            <View key={c.n} style={styles.row}>
              <Text style={styles.rowLabel}>Provider {c.n}</Text>
              <Text style={[styles.rowStatus, c.status === 'live' && { color: colors.forest }]}>
                {CALL_STATUS[c.status] || c.status}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
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
  spinner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 5,
    borderColor: colors.spinnerTrack,
    borderTopColor: colors.forest,
  },
  title: {
    ...font(700),
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.56,
    color: colors.ink,
    textAlign: 'center',
  },
  text: { ...font(400), fontSize: 17, lineHeight: 25, color: colors.body, textAlign: 'center' },
  list: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  rowLabel: { ...font(400), fontSize: 15, color: colors.muted },
  rowStatus: { ...font(600), fontSize: 15, color: colors.ink },
});
