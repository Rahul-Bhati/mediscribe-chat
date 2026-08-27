import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { MAX_RECORDING_MS } from '../hooks/useVoiceRecorder';
import { formatDuration } from '../lib/format';
import { colors, radii, spacing, type } from '../theme';

const WARN_REMAINING_MS = 15_000;

type Props = {
  elapsedMs: number;
};

/** Pulsing dot, elapsed timer, and a countdown warning near the 2-minute cap. */
export function RecordingIndicator({ elapsedMs }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const remainingMs = MAX_RECORDING_MS - elapsedMs;
  const isNearLimit = remainingMs <= WARN_REMAINING_MS;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity: pulse }]} />
      <Text style={styles.timer}>{formatDuration(elapsedMs)}</Text>
      <Text style={styles.hint} numberOfLines={1}>
        {isNearLimit
          ? `Stopping in ${Math.max(0, Math.ceil(remainingMs / 1000))}s`
          : 'Listening'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  timer: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    ...type.small,
    flex: 1,
    color: colors.textMuted,
  },
});
