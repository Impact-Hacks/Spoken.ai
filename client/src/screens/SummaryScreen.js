import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Field, Footer, IconButton, PrimaryButton, Title } from '../components/ui';
import { OFFERS, SERVICE_LABELS, buildSummary } from '../data/mock';
import { colors, font } from '../theme';

export default function SummaryScreen({ state, go, startCalls }) {
  const count = OFFERS.length;
  const { suggestedService, questions = [] } = state.intake;

  return (
    <>
      <Body>
        <IconButton icon="back" label="Back" onPress={() => go('questions')} />
        <Title>Here's what I'll ask</Title>
        <View style={{ gap: 20 }}>
          <Field label="Service">
            <View style={styles.box}>
              <Text style={styles.value}>{SERVICE_LABELS[suggestedService] || 'Repair'}</Text>
            </View>
          </Field>
          <Field label="Request">
            <View style={[styles.box, styles.request]}>
              <Text style={styles.value}>{buildSummary(state.issue, questions, state.answers, state.budget)}</Text>
            </View>
          </Field>
          <Pressable accessibilityRole="link" onPress={() => go('questions')} hitSlop={8}>
            <Text style={styles.edit}>Edit answers</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, minHeight: 20 }} />
        <View style={styles.callout}>
          <Text style={styles.calloutTitle}>I found {count} providers who may help.</Text>
          <Text style={styles.calloutText}>
            Shall I call them? You won't need to speak or pick up.
          </Text>
        </View>
      </Body>
      <Footer>
        <PrimaryButton label={`Call ${count} providers`} onPress={startCalls} />
      </Footer>
    </>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  request: { paddingVertical: 14 },
  value: { ...font(400), fontSize: 17, lineHeight: 25, color: colors.ink },
  edit: {
    ...font(600),
    fontSize: 15,
    color: colors.forest,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  callout: { borderRadius: 16, backgroundColor: colors.mist, padding: 20, gap: 4 },
  calloutTitle: { ...font(700), fontSize: 22, lineHeight: 28, letterSpacing: -0.22, color: colors.ink },
  calloutText: { ...font(400), fontSize: 15, lineHeight: 21, color: colors.body },
});
