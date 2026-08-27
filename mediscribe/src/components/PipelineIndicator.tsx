import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

export type PipelineStage = 'transcribing' | 'writing' | 'reading';

const LABELS: Record<PipelineStage, string> = {
  transcribing: 'Transcribing…',
  writing: 'Writing note…',
  reading: 'Reading the report…',
};

type Props = {
  stage: PipelineStage;
};

/**
 * Two labels rather than one spinner. A six-second wait with a single
 * "Loading" reads as broken; the same wait narrated in two steps reads as
 * deliberate work (PRD §7.1).
 */
export function PipelineIndicator({ stage }: Props) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.label}>{LABELS[stage]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  label: {
    ...type.small,
    fontSize: 13,
    color: colors.textMuted,
  },
});
