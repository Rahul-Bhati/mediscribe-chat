import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow, spacing, type } from '../theme';
import { RecordingIndicator } from './RecordingIndicator';

type Props = {
  text: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach: () => void;
  onToggleRecording: () => void;
  isRecording: boolean;
  /** True while a recording is being transcribed and written up. */
  isBusy?: boolean;
  elapsedMs: number;
};

/**
 * One floating pill: attach on the left, the field in the middle, and a single
 * right-hand button whose job changes with context — mic when empty, send once
 * you type, stop while recording. That swap is the WhatsApp pattern; it needs
 * no explanation, which is the point.
 */
export function ChatComposer({
  text,
  onChangeText,
  onSend,
  onAttach,
  onToggleRecording,
  isRecording,
  isBusy = false,
  elapsedMs,
}: Props) {
  const insets = useSafeAreaInsets();
  const hasText = text.trim().length > 0;

  const action = isRecording ? 'stop' : hasText ? 'send' : 'record';
  // A second recording started mid-pipeline would race the first one's reply.
  const isActionDisabled = isBusy && !isRecording;
  const actionIcon = action === 'stop' ? 'square' : action === 'send' ? 'arrow-up' : 'mic';
  const actionLabel =
    action === 'stop' ? 'Stop recording' : action === 'send' ? 'Send message' : 'Start recording';

  const handleAction = () => {
    if (action === 'send') {
      onSend();
      return;
    }
    onToggleRecording();
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <View style={styles.pill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach a lab report"
          onPress={onAttach}
          disabled={isRecording || isBusy}
          style={({ pressed }) => [
            styles.iconButton,
            (isRecording || isBusy) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={22} color={colors.textMuted} />
        </Pressable>

        {isRecording ? (
          <RecordingIndicator elapsedMs={elapsedMs} />
        ) : (
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={onChangeText}
            placeholder="Ask MediScribe"
            placeholderTextColor={colors.textMuted}
            multiline
            // A multiline field becomes a <textarea> on web, which defaults to
            // two rows. Web-only: on Android numberOfLines caps growth.
            {...(Platform.OS === 'web' ? { numberOfLines: 1 } : null)}
            accessibilityLabel="Message"
          />
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={handleAction}
          disabled={isActionDisabled}
          style={({ pressed }) => [
            styles.actionButton,
            action !== 'record' && styles.actionButtonActive,
            isActionDisabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={actionIcon}
            size={action === 'stop' ? 13 : 20}
            color={action === 'record' ? colors.textMuted : colors.textOnAccent}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    ...type.body,
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 10 : spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 10 : spacing.sm,
    color: colors.text,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  actionButtonActive: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.55,
  },
  disabled: {
    opacity: 0.3,
  },
});
