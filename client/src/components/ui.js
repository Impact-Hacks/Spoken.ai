import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, font } from '../theme';

export function Body({ children, scroll = true, style }) {
  if (!scroll) return <View style={[styles.body, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.body, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function KeyboardScreen({ children }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export function Footer({ children, hint }) {
  return (
    <View style={styles.footer}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled, variant = 'primary' }) {
  const secondary = variant === 'secondary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pressed && !secondary && { backgroundColor: colors.limePressed },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && font(600)]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={styles.iconButton}
    >
      {icon === 'close' ? <CloseIcon /> : <BackIcon />}
    </Pressable>
  );
}

const CloseIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18">
    <Path d="M3 3L15 15M15 3L3 15" stroke={colors.forest} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BackIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18">
    <Path
      d="M11 3L5 9L11 15"
      stroke={colors.forest}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const CheckIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28">
    <Path
      d="M6 14L12 20L22 8"
      stroke={colors.forest}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export function Title({ children, style }) {
  return (
    <Text accessibilityRole="header" style={[styles.title, style]}>
      {children}
    </Text>
  );
}

export function Field({ label, optional, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      {children}
    </View>
  );
}

export function Input({ prefix, multiline, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrap}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.dashed}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.textarea,
          prefix && { paddingLeft: 34 },
          focused && styles.inputFocused,
          style,
        ]}
      />
    </View>
  );
}

export function RadioOption({ label, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.radio,
        selected && styles.radioSelected,
        pressed && !selected && { backgroundColor: colors.hover },
      ]}
    >
      <Text style={styles.radioText}>{label}</Text>
      {selected ? (
        <View style={styles.radioDotOn}>
          <View style={styles.radioDotInner} />
        </View>
      ) : (
        <View style={styles.radioDotOff} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { flexGrow: 1, paddingTop: 12, paddingHorizontal: 24 },
  footer: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 24, gap: 8 },
  hint: { ...font(400), fontSize: 14, color: colors.muted, textAlign: 'center' },
  button: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: colors.chip },
  buttonText: { ...font(700), fontSize: 17, color: colors.forest },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...font(700),
    marginTop: 24,
    marginBottom: 20,
    fontSize: 32,
    lineHeight: 35,
    letterSpacing: -0.8,
    color: colors.ink,
  },
  field: { gap: 8 },
  label: { ...font(600), fontSize: 15, color: colors.ink },
  optional: { ...font(400), color: colors.muted },
  inputWrap: { justifyContent: 'center' },
  prefix: {
    ...font(400),
    position: 'absolute',
    left: 16,
    fontSize: 17,
    color: colors.muted,
    zIndex: 1,
  },
  input: {
    ...font(400),
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.ink,
  },
  textarea: { height: undefined, minHeight: 112, paddingTop: 14, paddingBottom: 14, lineHeight: 24 },
  inputFocused: { borderWidth: 2, borderColor: colors.forest },
  radio: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radioSelected: { borderWidth: 2, borderColor: colors.forest, paddingHorizontal: 15 },
  radioText: { ...font(400), fontSize: 17, color: colors.ink, flexShrink: 1 },
  radioDotOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lime },
  radioDotOff: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.dashed },
});
