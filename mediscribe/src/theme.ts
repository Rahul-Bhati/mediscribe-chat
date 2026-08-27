/**
 * Warm-paper palette. The reference product keeps chrome almost invisible:
 * an off-white page, near-black text, one warm accent, and no coloured
 * containers except a soft tan for the user's own turns.
 */
export const colors = {
  /** Page background — warm off-white, not grey. */
  paper: '#F6F4F1',
  /** Raised surfaces: composer, cards, header. */
  surface: '#FFFFFF',
  /** Barely-there fills for chips and inset cards. */
  surfaceSunken: '#F1EEEA',
  border: '#E7E2DB',

  text: '#191817',
  textMuted: '#8B857D',
  textOnAccent: '#FFFFFF',

  /** The one accent: warm red-orange, used for the mark and live recording. */
  accent: '#DC4A2A',
  accentSoft: '#FBEBE6',

  /** The user's own messages — soft tan, never the accent. */
  userBubble: '#EDE3D6',
  userBubbleText: '#26221D',

  /** Tint for a lab value outside its reference range. Notice, not alarm. */
  outOfRange: '#FDF4E7',

  /** Linked-evidence highlight, used from Milestone 4 on. */
  highlight: '#F6E3B8',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** One soft, low-contrast lift. Used sparingly — only on the composer. */
export const shadow = {
  shadowColor: '#3D3227',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

export const type = {
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 11, lineHeight: 14 },
} as const;
