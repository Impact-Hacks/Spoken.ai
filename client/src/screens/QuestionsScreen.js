import { StyleSheet, Text, View } from 'react-native';
import { Body, Footer, IconButton, PrimaryButton, RadioOption, Title } from '../components/ui';
import { colors, font } from '../theme';

export default function QuestionsScreen({ state, update, go }) {
  const questions = state.intake.questions || [];
  const ok = questions.length > 0 && questions.every((q) => state.answers[q.id]);

  return (
    <>
      <Body>
        <IconButton icon="back" label="Back" onPress={() => go('details')} />
        <Title>Two quick questions</Title>
        <View style={{ gap: 24 }}>
          {questions.map((q) => (
            <View key={q.id} accessibilityRole="radiogroup" style={{ gap: 8 }}>
              <Text style={styles.question}>{q.text}</Text>
              {q.purpose ? <Text style={styles.purpose}>Why we ask: {q.purpose}</Text> : null}
              <View style={{ gap: 8 }}>
                {q.options.map((label) => (
                  <RadioOption
                    key={label}
                    label={label}
                    selected={state.answers[q.id] === label}
                    onPress={() => update({ answers: { ...state.answers, [q.id]: label } })}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </Body>
      <Footer>
        <PrimaryButton label="Continue" disabled={!ok} onPress={() => go('summary')} />
      </Footer>
    </>
  );
}

const styles = StyleSheet.create({
  question: { ...font(600), fontSize: 15, lineHeight: 21, color: colors.ink },
  purpose: { ...font(400), fontSize: 13, lineHeight: 18, color: colors.muted },
});
