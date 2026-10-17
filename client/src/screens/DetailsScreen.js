import { StyleSheet, Text, View } from 'react-native';
import { Body, Field, Footer, IconButton, Input, KeyboardScreen, PrimaryButton, Title } from '../components/ui';
import { colors, font } from '../theme';

export default function DetailsScreen({ state, update, go, detailsDone }) {
  const ok =
    state.name.trim() && state.phone.trim() && state.address.trim() && state.zip.length === 5;
  const { status, code, message } = state.intake;
  const waiting = state.awaitingQuestions && status === 'loading';
  const failed = status === 'error';

  let hint = ok ? null : 'Fill in name, phone, address and a 5-digit ZIP';
  if (ok && failed) hint = message;
  let label = 'Continue';
  if (waiting) label = 'Preparing your questions…';
  else if (ok && failed) label = code === 'IMAGE_UNCLEAR' ? 'Retake photo' : 'Try again';

  return (
    <KeyboardScreen>
      <Body>
        <IconButton icon="back" label="Back" onPress={() => go('describe')} />
        <Title style={{ marginBottom: 8 }}>Your details</Title>
        <Text style={styles.sub}>Shared with a provider only when you send a booking request.</Text>
        <View style={styles.fields}>
          <Field label="Full name">
            <Input
              value={state.name}
              onChangeText={(name) => update({ name })}
              autoComplete="name"
              textContentType="name"
              placeholder="Jane Smith"
            />
          </Field>
          <Field label="Phone">
            <Input
              value={state.phone}
              onChangeText={(phone) => update({ phone })}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              placeholder="(510) 123-4567"
            />
          </Field>
          <Field label="Property address">
            <Input
              value={state.address}
              onChangeText={(address) => update({ address })}
              autoComplete="street-address"
              textContentType="streetAddressLine1"
              placeholder="Street address"
            />
          </Field>
          <View style={styles.row}>
            <View style={styles.col}>
              <Field label="ZIP code">
                <Input
                  value={state.zip}
                  onChangeText={(v) => update({ zip: v.replace(/[^0-9]/g, '').slice(0, 5) })}
                  keyboardType="number-pad"
                  autoComplete="postal-code"
                  textContentType="postalCode"
                  placeholder="94542"
                />
              </Field>
            </View>
            <View style={styles.col}>
              <Field label="Unit" optional>
                <Input
                  value={state.unit}
                  onChangeText={(unit) => update({ unit })}
                  placeholder="Unit 4B"
                />
              </Field>
            </View>
          </View>
        </View>
      </Body>
      <Footer hint={hint}>
        <PrimaryButton label={label} disabled={!ok || waiting} onPress={detailsDone} />
      </Footer>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  sub: { ...font(400), marginBottom: 20, fontSize: 15, lineHeight: 21, color: colors.muted },
  fields: { gap: 20 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, minWidth: 0 },
});
