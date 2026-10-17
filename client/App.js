import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';

import { OFFERS } from './src/data/mock';
import { colors } from './src/theme';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DescribeScreen from './src/screens/DescribeScreen';
import DetailsScreen from './src/screens/DetailsScreen';
import QuestionsScreen from './src/screens/QuestionsScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import BookingScreen from './src/screens/BookingScreen';
import SentScreen from './src/screens/SentScreen';

const SCREENS = {
  onboarding: OnboardingScreen,
  describe: DescribeScreen,
  details: DetailsScreen,
  questions: QuestionsScreen,
  summary: SummaryScreen,
  loading: LoadingScreen,
  results: ResultsScreen,
  booking: BookingScreen,
  sent: SentScreen,
};

// Where the Android hardware back button goes from each screen.
const BACK = {
  describe: 'onboarding',
  details: 'describe',
  questions: 'details',
  summary: 'questions',
  booking: 'results',
};

const INITIAL = {
  screen: 'onboarding',
  photo: null,
  issue: '',
  budget: '',
  answers: {},
  offer: 'bluewave',
  slot: 0,
  name: '',
  phone: '',
  address: '',
  zip: '',
  unit: '',
  email: '',
  sending: false,
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const [state, setState] = useState(INITIAL);
  const timers = useRef([]);

  const update = useCallback((patch) => setState((s) => ({ ...s, ...patch })), []);
  const go = useCallback((screen) => update({ screen }), [update]);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = BACK[state.screen];
      if (!prev) return false;
      go(prev);
      return true;
    });
    return () => sub.remove();
  }, [state.screen, go]);

  // Simulated call + comparison; swap for POST /api/call and status polling.
  const startCalls = () => {
    go('loading');
    later(() => setState((s) => (s.screen === 'loading' ? { ...s, screen: 'results' } : s)), 3500);
  };

  // Simulated send; swap for the booking endpoint.
  const sendBooking = () => {
    update({ sending: true });
    later(() => update({ sending: false, screen: 'sent' }), 1200);
  };

  const restart = () =>
    setState((s) => ({ ...s, screen: 'onboarding', answers: {}, offer: 'bluewave', slot: 0, sending: false }));

  if (!fontsLoaded) return null;

  const Screen = SCREENS[state.screen];
  const offer = OFFERS.find((o) => o.id === state.offer);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <Screen
          state={state}
          update={update}
          go={go}
          offer={offer}
          startCalls={startCalls}
          sendBooking={sendBooking}
          restart={restart}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
});
