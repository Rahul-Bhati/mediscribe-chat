import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

export type Suggestion = {
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  suggestions: Suggestion[];
};

/**
 * The "Follow ups" affordance from the reference design: outlined pills under
 * an assistant turn that say, in plain words, what to do next. This is what
 * carries key result KR5 — a stranger handed the phone should not need to be
 * told where to start.
 */
export function SuggestionPills({ title, suggestions }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.pills}>
        {suggestions.map((suggestion) => (
          <Pressable
            key={suggestion.label}
            accessibilityRole="button"
            accessibilityLabel={suggestion.label}
            onPress={suggestion.onPress}
            style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
          >
            <Text style={styles.pillText}>{suggestion.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
  },
  title: {
    ...type.small,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillText: {
    ...type.small,
    fontSize: 13,
    color: colors.text,
  },
  pressed: {
    backgroundColor: colors.surfaceSunken,
  },
});
