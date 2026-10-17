import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

export default function LoadingScreen({ go }) {
  return (
    <>
      <View accessibilityRole="progressbar" accessibilityLiveRegion="polite" style={styles.body}>
        <Spinner />
        <Text style={styles.title}>Calling providers and comparing offers</Text>
        <Text style={styles.text}>
          This usually takes a few minutes. You can leave the app — we'll keep going and your
          results will be here.
        </Text>
      </View>
      <Footer>
        <PrimaryButton
          variant="secondary"
          label="Skip to results (demo)"
          onPress={() => go('results')}
        />
      </Footer>
    </>
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
});
