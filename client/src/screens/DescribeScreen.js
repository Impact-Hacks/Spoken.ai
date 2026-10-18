import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Body, Field, Footer, IconButton, Input, KeyboardScreen, PrimaryButton, Title } from '../components/ui';
import { colors, font } from '../theme';

const PICK_OPTIONS = { mediaTypes: ['images'], quality: 0.7 };

export default function DescribeScreen({ state, update, go, describeDone }) {
  const ok = !!state.photo && state.issue.trim().length > 0 && Number(state.budget) > 0;
  const rejected = state.intake.status === 'error' && state.intake.code === 'ISSUE_REJECTED';
  // Changing the photo or the text clears a rejection; Continue checks them again.
  const edit = (patch) => update(rejected ? { ...patch, intake: { status: 'idle' } } : patch);
  let hint = ok ? null : 'Add a photo, a description and your budget to continue';
  if (ok && rejected) hint = state.intake.message;

  const pick = async (source) => {
    const fromCamera = source === 'camera';
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', `Allow ${fromCamera ? 'camera' : 'photo'} access to add a photo.`);
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync(PICK_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS);
    if (!result.canceled) edit({ photo: result.assets[0] });
  };

  const choosePhoto = () =>
    Alert.alert('Photo of the problem', undefined, [
      { text: 'Take photo', onPress: () => pick('camera') },
      { text: 'Choose from library', onPress: () => pick('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <KeyboardScreen>
      <Body>
        <IconButton icon="close" label="Close" onPress={() => go('onboarding')} />
        <Title>Tell us about the problem</Title>
        <View style={styles.fields}>
          <Field label="Photo of the problem">
            {state.photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Removes this photo so you can retake it"
                onPress={() => edit({ photo: null })}
                style={styles.photoRow}
              >
                <Image source={{ uri: state.photo.uri }} style={styles.thumb} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.photoName} numberOfLines={1}>
                    {state.photo.fileName || 'Photo added'}
                  </Text>
                  <Text style={styles.photoHint}>Tap to remove and retake</Text>
                </View>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={choosePhoto}
                style={({ pressed }) => [styles.dropzone, pressed && { backgroundColor: colors.hover }]}
              >
                <Text style={styles.dropTitle}>Take or choose a photo</Text>
                <Text style={styles.photoHint}>Required</Text>
              </Pressable>
            )}
          </Field>
          <Field label="What's happening?">
            <Input
              multiline
              value={state.issue}
              onChangeText={(issue) => edit({ issue })}
              placeholder="Describe the problem in your own words"
            />
          </Field>
          <Field label="Max budget">
            <Input
              prefix="$"
              value={state.budget}
              onChangeText={(v) => update({ budget: v.replace(/[^0-9]/g, '') })}
              keyboardType="number-pad"
              placeholder="0"
            />
          </Field>
        </View>
      </Body>
      <Footer hint={hint}>
        <PrimaryButton label="Continue" disabled={!ok} onPress={describeDone} />
      </Footer>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 20 },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.chip },
  photoName: { ...font(600), fontSize: 16, color: colors.ink },
  photoHint: { ...font(400), fontSize: 14, color: colors.muted },
  dropzone: {
    height: 96,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dropTitle: { ...font(600), fontSize: 16, color: colors.forest },
});
