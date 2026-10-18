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

import {
  getCallStatus,
  getResults,
  newRequestId,
  sendBooking as requestBooking,
  startCalls as requestCalls,
  submitAnswers,
  submitIntake,
} from './src/lib/api';
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
  // status: idle | saving | ready | error. Ready carries providerCount.
  brief: { status: 'idle' },
  // status: idle | starting | processing | error. progress is [{ n, status }] per call.
  calls: { status: 'idle', progress: [] },
  offers: [],
  offer: null,
  slot: 0,
  name: '',
  phone: '',
  address: '',
  zip: '',
  unit: '',
  email: '',
  sending: false,
  bookingError: null,
  receipt: null,
  // status: idle | loading | ready | error. Ready carries sessionId, suggestedService, questions.
  intake: { status: 'idle' },
  // True when the user tapped Continue on details before the questions came back.
  awaitingQuestions: false,
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
  const intakeRequest = useRef(null);
  const callsRun = useRef(null);
  // { id, key }: the id is reused when the same request is retried, so the server never emails
  // twice for one tap. A changed slot or email is a new request and gets a new id.
  const bookingRequest = useRef(null);

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

  // Sends photo + issue + budget (never the contact details) as soon as the user leaves the
  // describe screen, so Gemini's questions are usually ready by the time details are filled in.
  const startIntake = () => {
    const { photo, issue, budget, intake } = state;
    const key = `${photo.uri}|${issue.trim()}|${budget}`;
    if (intakeRequest.current?.key === key && intake.status !== 'error') return;

    const request = { key };
    intakeRequest.current = request;
    update({ intake: { status: 'loading' }, answers: {} });

    submitIntake({ photo, issue, budget })
      .then((data) => {
        if (intakeRequest.current !== request) return;
        setState((s) => ({
          ...s,
          intake: { status: 'ready', ...data },
          screen: s.awaitingQuestions && s.screen === 'details' ? 'questions' : s.screen,
          awaitingQuestions: false,
        }));
      })
      .catch((err) => {
        if (intakeRequest.current !== request) return;
        setState((s) => ({
          ...s,
          intake: { status: 'error', code: err.code, message: err.message },
          awaitingQuestions: false,
        }));
      });
  };

  const describeDone = () => {
    startIntake();
    go('details');
  };

  const detailsDone = () => {
    const { status, code } = state.intake;
    if (status === 'ready') return go('questions');
    if (status === 'error' && code === 'IMAGE_UNCLEAR') {
      intakeRequest.current = null;
      return update({ photo: null, intake: { status: 'idle' }, screen: 'describe' });
    }
    // Keep the photo and text; the describe screen shows why the text was rejected.
    if (status === 'error' && code === 'ISSUE_REJECTED') return go('describe');
    update({ awaitingQuestions: true });
    if (status !== 'loading') startIntake();
  };

  // Saves the two answers, then shows the summary with the real provider count.
  const answersDone = () => {
    update({ brief: { status: 'saving' } });
    submitAnswers({ sessionId: state.intake.sessionId, answers: state.answers })
      .then(({ providerCount }) =>
        setState((s) => ({ ...s, brief: { status: 'ready', providerCount }, screen: 'summary' }))
      )
      .catch((err) => update({ brief: { status: 'error', message: err.message } }));
  };

  // Polls call progress every ~3 s (backing off on errors) until the comparison is ready.
  const pollCalls = (run, sessionId, errors = 0) => {
    if (callsRun.current !== run) return;
    getCallStatus(sessionId)
      .then(async ({ status, calls }) => {
        if (callsRun.current !== run) return;
        if (status === 'processing') {
          setState((s) => ({ ...s, calls: { status: 'processing', progress: calls } }));
          return later(() => pollCalls(run, sessionId), 3000);
        }
        const { offers, recommendedId } = await getResults(sessionId);
        if (callsRun.current !== run) return;
        const first = offers.find((o) => o.slots.length);
        setState((s) => ({
          ...s,
          calls: { status: 'idle', progress: calls },
          offers,
          offer: recommendedId || first?.id || offers[0]?.id || null,
          slot: 0,
          screen: 'results',
        }));
      })
      .catch(() => later(() => pollCalls(run, sessionId, errors + 1), Math.min(3000 * 2 ** errors, 15000)));
  };

  const startCalls = () => {
    const run = {};
    callsRun.current = run;
    const { sessionId } = state.intake;
    update({ screen: 'loading', calls: { status: 'starting', progress: [] } });
    requestCalls({ sessionId, customerName: state.name })
      .then(() => pollCalls(run, sessionId))
      .catch((err) => {
        if (callsRun.current !== run) return;
        update({ calls: { status: 'error', progress: [], message: err.message } });
      });
  };

  // Emails the request to the provider. Once sent, drop the photo,
  // text and details and keep only what the confirmation screen shows.
  const sendBooking = () => {
    const sent = state.offers.find((o) => o.id === state.offer);
    const slot = sent.slots[state.slot];
    const key = JSON.stringify([sent.id, slot, state.email.trim()]);
    if (bookingRequest.current?.key !== key) bookingRequest.current = { id: newRequestId(), key };
    update({ sending: true, bookingError: null });
    requestBooking({
      sessionId: state.intake.sessionId,
      providerId: sent.id,
      slot,
      price: sent.priceLong,
      terms: sent.detail,
      issue: state.issue.trim(),
      customer: {
        name: state.name,
        phone: state.phone,
        address: state.address,
        unit: state.unit,
        zip: state.zip,
        email: state.email.trim(),
      },
      clientRequestId: bookingRequest.current.id,
    })
      .then(() => {
        bookingRequest.current = null;
        intakeRequest.current = null;
        setState({
          ...INITIAL,
          screen: 'sent',
          receipt: { provider: sent.name, slot, price: sent.priceLong, email: state.email.trim() },
        });
      })
      .catch((err) => update({ sending: false, bookingError: err.message }));
  };

  // A finished or abandoned flow starts the next one from a blank slate: photo, text and details.
  const restart = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    intakeRequest.current = null;
    callsRun.current = null;
    bookingRequest.current = null;
    setState(INITIAL);
  };

  if (!fontsLoaded) return null;

  const Screen = SCREENS[state.screen];
  const offer = state.offers.find((o) => o.id === state.offer);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <Screen
          state={state}
          update={update}
          go={go}
          offer={offer}
          describeDone={describeDone}
          detailsDone={detailsDone}
          answersDone={answersDone}
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
