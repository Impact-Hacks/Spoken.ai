import { StyleSheet, Text, View } from 'react-native';
import { CheckIcon, Footer, PrimaryButton } from '../components/ui';
import { colors, font } from '../theme';

export default function SentScreen({ state, restart }) {
  const { receipt } = state;
  const rows = [
    ['Requested time', receipt.slot],
    ['Quoted price', receipt.price],
    ['Appointment', 'Not yet confirmed'],
  ];

  return (
    <>
      <View accessibilityLiveRegion="polite" style={styles.body}>
        <View style={styles.check}>
          <CheckIcon />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Booking request sent
        </Text>
        <Text style={styles.text}>
          Awaiting provider confirmation. Your appointment isn't booked until {receipt.provider}{' '}
          replies to {receipt.email}.
        </Text>
        <View style={styles.table}>
          {rows.map(([k, v], i) => (
            <View key={k} style={[styles.row, i < rows.length - 1 && styles.rowDivider]}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.val}>{v}</Text>
            </View>
          ))}
        </View>
      </View>
      <Footer>
        <PrimaryButton label="Done" onPress={restart} />
      </Footer>
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 20 },
  check: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font(700), fontSize: 32, lineHeight: 35, letterSpacing: -0.8, color: colors.ink },
  text: { ...font(400), fontSize: 17, lineHeight: 25, color: colors.body },
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  key: { ...font(400), fontSize: 15, color: colors.muted },
  val: { ...font(600), fontSize: 15, color: colors.ink, textAlign: 'right', flexShrink: 1 },
});
