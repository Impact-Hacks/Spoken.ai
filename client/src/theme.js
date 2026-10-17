export const colors = {
  ink: '#0E0F0C',
  forest: '#163300',
  lime: '#9FE870',
  limePressed: '#8EDB5E',
  white: '#FFFFFF',
  mist: '#F1F5EA',
  chip: '#EEF0EA',
  hover: '#F6F8F2',
  border: '#BFC2BA',
  borderSoft: '#E4E6E0',
  dashed: '#9A9D94',
  body: '#45483F',
  muted: '#5D6058',
  spinnerTrack: '#E4E8DC',
  online: '#3DAA3A',
};

// Custom fonts ignore fontWeight in React Native, so each weight is its own family.
const families = {
  400: 'Figtree_400Regular',
  500: 'Figtree_500Medium',
  600: 'Figtree_600SemiBold',
  700: 'Figtree_700Bold',
  800: 'Figtree_800ExtraBold',
};

export const font = (weight = 400) => ({ fontFamily: families[weight] });
