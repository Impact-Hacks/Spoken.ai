import { StyleSheet, Text, View } from 'react-native';
import {
  Body,
  Field,
  Footer,
  IconButton,
  Input,
  KeyboardScreen,
  PrimaryButton,
  RadioOption,
  Title,
} from '../components/ui';
import { colors, font } from '../theme';

export default function BookingScreen({ state, update, go, offer, sendBooking }) {
  return (
    <KeyboardScreen>
      <Body>
        <IconButton icon="back" label="Back" onPress={() => go('results')} />
        <Title>Request an appointment</Title>
        <View style={{ gap: 20 }}>
          <Field label={`Time offered by ${offer.name}`}>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {offer.slots.map((label, i) => (
                <RadioOption
                  key={label}
                  label={label}
                  selected={i === state.slot}
                  onPress={() => update({ slot: i })}
                />
              ))}
            </View>
          </Field>
          <Field label="Your name">
            <Input value={state.name} onChangeText={(name) => update({ name })} autoComplete="name" />
          </Field>
          <Field label="Service address">
            <Input
              value={state.address}
              onChangeText={(address) => update({ address })}
              autoComplete="street-address"
            />
          </Field>
          <Field label="Contact email">
            <Input
              value={state.email}
              onChangeText={(email) => update({ email })}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />
          </Field>
        </View>
      </Body>
      <Footer>
        <Text style={styles.note}>
          We'll email this request to {offer.name}. They confirm the appointment.
        </Text>
        <PrimaryButton
          label={state.sending ? 'Sending booking request…' : 'Send booking request'}
          disabled={state.sending || !state.email.trim()}
          onPress={sendBooking}
        />
      </Footer>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  note: { ...font(400), fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: 'center', marginBottom: 2 },
});
