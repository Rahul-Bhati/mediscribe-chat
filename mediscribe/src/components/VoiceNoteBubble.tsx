import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { formatDuration } from '../lib/format';
import { colors, radii, spacing } from '../theme';
import type { VoiceNote } from '../types';

/** Static bar heights — a suggestion of a waveform, not a real one. */
const BARS = [7, 13, 9, 17, 11, 19, 8, 15, 10, 18, 12, 7, 14, 9, 16, 8];

type Props = {
  voiceNote: VoiceNote;
};

/**
 * The user's recorded message in the timeline. Milestone 1 showed the duration
 * only; Milestone 3 attaches the transcription result to the reply that
 * follows it.
 */
export function VoiceNoteBubble({ voiceNote }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Ionicons name="mic" size={15} color={colors.userBubbleText} />
        <View style={styles.waveform}>
          {BARS.map((height, index) => (
            <View key={index} style={[styles.bar, { height }]} />
          ))}
        </View>
        <Text style={styles.duration}>{formatDuration(voiceNote.durationMs)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.userBubble,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
  },
  bar: {
    width: 2.5,
    borderRadius: radii.pill,
    backgroundColor: colors.userBubbleText,
    opacity: 0.55,
  },
  duration: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.userBubbleText,
    fontVariant: ['tabular-nums'],
  },
});
