import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

export default function ResultsScreen({ state, update, go, offer, restart }) {
  const canBook = !!offer && offer.slots.length > 0;

  return (
    <>
      <Body>
        <Text accessibilityRole="header" style={styles.title}>
          Your offers
        </Text>
        <Text style={styles.sub}>
          {state.offers.some((o) => o.slots.length)
            ? 'Tap a provider to choose it.'
            : 'No provider offered an appointment time this round.'}
        </Text>
        <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
          {state.offers.map((o) => {
            const selected = o.id === state.offer;
            const available = o.slots.length > 0;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled: !available }}
                disabled={!available}
                onPress={() => update({ offer: o.id, slot: 0 })}
                style={[styles.card, selected && styles.cardSelected, !available && { opacity: 0.7 }]}
              >
                {o.best ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>BEST COMPARABLE OFFER</Text>
                  </View>
                ) : null}
                <View style={styles.row}>
                  <Text style={styles.name}>{o.name}</Text>
                  <Text style={styles.price}>{o.price}</Text>
                </View>
                <Text style={styles.detail}>{o.detail}</Text>
                {available ? <Text style={styles.earliest}>Earliest: {o.slots[0]}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Body>
      <Footer>
        {canBook ? (
          <PrimaryButton label={`Choose ${offer.name}`} onPress={() => go('booking')} />
        ) : (
          <PrimaryButton label="Start over" onPress={restart} />
        )}
      </Footer>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    ...font(700),
    marginBottom: 6,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  sub: { ...font(400), marginBottom: 16, fontSize: 15, color: colors.muted },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 6,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.forest, paddingVertical: 14, paddingHorizontal: 15 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lime,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeText: { ...font(700), fontSize: 12, letterSpacing: 0.24, color: colors.forest },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  name: { ...font(700), fontSize: 17, color: colors.ink, flexShrink: 1 },
  price: { ...font(800), fontSize: 19, color: colors.ink },
  detail: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.body },
  earliest: { ...font(600), fontSize: 14, color: colors.ink },
});
