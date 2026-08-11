import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#0B0B0F',
  surface: '#15151B',
  surfaceRaised: '#1D1D25',
  surfaceSoft: '#25252E',
  border: '#2B2B35',
  text: '#F7F7FA',
  textMuted: '#9999A6',
  textDim: '#6F6F7A',
  accent: '#A998FF',
  accentStrong: '#806DFF',
  accentInk: '#100D22',
  success: '#58D68D',
  warning: '#F0B35A',
  danger: '#FF737D',
  white: '#FFFFFF',
  black: '#000000'
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 36 } as const;
export const radii = { sm: 8, md: 12, lg: 18, xl: 24, round: 999 } as const;

// Heights exclude device safe-area insets. Consumers add the current inset.
export const TAB_BAR_BASE_HEIGHT = 70;
export const MINI_PLAYER_HEIGHT = 66;
export const PLAYER_OVERLAY_CLEARANCE = MINI_PLAYER_HEIGHT + spacing.xxl;

export const typography = {
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 } satisfies TextStyle,
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8 } satisfies TextStyle,
  section: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 } satisfies TextStyle,
  body: { fontSize: 15, lineHeight: 21 } satisfies TextStyle,
  caption: { fontSize: 12, lineHeight: 16 } satisfies TextStyle
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: 8
  } satisfies ViewStyle
} as const;
