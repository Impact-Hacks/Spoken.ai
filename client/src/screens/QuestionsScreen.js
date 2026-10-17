import { StyleSheet, Text, View } from 'react-native';
import { Body, Footer, IconButton, PrimaryButton, RadioOption, Title } from '../components/ui';
import { QUESTIONS } from '../data/mock';
import { colors, font } from '../theme';

export default function QuestionsScreen({ state, update, go }) {
  const ok = QUESTIONS.every((q) => state.answers[q.id]);

  return (
    <>
      <Body>
        <IconButton icon="back" label="Back" onPress={() => go('details')} />
        <Title>Two quick questions</Title>
        <View style={{ gap: 24 }}>
          {QUESTIONS.map((q) => (
            <View key={q.id} accessibilityRole="radiogroup" style={{ gap: 8 }}>
              <Text style={styles.question}>{q.text}</Text>
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
  question: { ...font(600), fontSize: 15, color: colors.ink },
});
