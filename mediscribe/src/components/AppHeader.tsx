import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, type } from '../theme';

/**
 * Deliberately quiet: a mark, a name, and the safety disclaimer required by
 * §7.5 of the PRD. The disclaimer is not dismissible — it stays for the whole
 * session — but it is set as small muted text rather than a warning banner, so
 * it reads as a standing footnote instead of an alarm the user learns to ignore.
 */
export function AppHeader() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.row}>
        <Text style={styles.mark}>A</Text>
        <Text style={styles.title}>MediScribe</Text>
      </View>
      <Text style={styles.disclaimer}>
        Demo only. Not a medical device. Do not use for real clinical decisions.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  mark: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.3,
  },
  disclaimer: {
    ...type.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
