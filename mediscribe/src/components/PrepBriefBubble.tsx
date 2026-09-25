import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';
import type { CitedLine, PrepNote } from '../types';

const TRANSCRIPT_MAX_HEIGHT = 260;
const SHARE_DISCLAIMER = 'Automated summary of what was said, not medical advice.';

type Props = {
  note: PrepNote;
  saved: boolean;
  onKeep: () => void;
  onDelete: () => void;
};

function shareText(note: PrepNote): string {
  const { brief } = note;
  const bullets = (lines: CitedLine[], empty: string) =>
    lines.length > 0 ? lines.map((line) => `- ${line.text}`).join('\n') : `- ${empty}`;

  return [
    SHARE_DISCLAIMER,
    '',
    'What the speaker said',
    '',
    `Reason: ${brief.reason?.text ?? 'Not stated'}`,
    '',
    'Symptoms:',
    bullets(brief.symptoms, 'None stated'),
    '',
    'Medicines:',
    bullets(brief.medicines, 'None stated'),
    '',
    'Allergies:',
    bullets(brief.allergies ?? [], 'None stated'),
    '',
    'Questions:',
    bullets(brief.questions, 'None asked'),
  ].join('\n');
}

/**
 * A pre-visit brief. Tap a line to see the words it came from. Share sends
 * the text only, and only after the person holding the phone taps the button.
 */
export function PrepBriefBubble({ note, saved, onKeep, onDelete }: Props) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeIds, setActiveIds] = useState<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<number, number>>({});

  const handlePress = useCallback(
    (key: string, ids: number[]) => {
      const isSame = activeKey === key;
      setActiveKey(isSame ? null : key);
      setActiveIds(isSame ? [] : ids);
    },
    [activeKey]
  );

  useEffect(() => {
    if (activeIds.length === 0) return;
    const target = Math.min(...activeIds.map((id) => offsets.current[id] ?? 0));
    scrollRef.current?.scrollTo({ y: Math.max(0, target - spacing.sm), animated: true });
  }, [activeIds]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: shareText(note) });
    } catch {
      Alert.alert('Share failed', "The share sheet didn't open. The brief is still on this screen.");
    }
  }, [note]);

  const sections: { title: string; lines: CitedLine[]; empty: string }[] = [
    { title: 'Reason', lines: note.brief.reason ? [note.brief.reason] : [], empty: 'Not stated' },
    { title: 'Symptoms', lines: note.brief.symptoms, empty: 'None stated' },
    { title: 'Medicines', lines: note.brief.medicines, empty: 'None stated' },
    { title: 'Allergies', lines: note.brief.allergies ?? [], empty: 'None stated' },
    { title: 'Questions', lines: note.brief.questions, empty: 'None asked' },
  ];

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>WHAT THE SPEAKER SAID</Text>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.title.toUpperCase()}</Text>
          {section.lines.length > 0 ? (
            section.lines.map((line, index) => {
              const key = `${section.title}-${index}`;
              const active = activeKey === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => handlePress(key, line.source_segment_ids)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${line.text}. Tap to ${active ? 'hide' : 'show'} its source in the transcript.`}
                  style={({ pressed }) => [
                    styles.bullet,
                    active && styles.bulletActive,
                    pressed && styles.bulletPressed,
                  ]}
                >
                  <Text style={[styles.bulletMark, active && styles.bulletMarkActive]}>•</Text>
                  <Text style={styles.bulletText}>
                    {line.text}
                    <Text style={[styles.evidence, active && styles.evidenceActive]}>
                      {'  '}
                      {line.source_segment_ids.map((id) => `[${id}]`).join(' ')}
                    </Text>
                  </Text>
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyLine}>{section.empty}</Text>
          )}
        </View>
      ))}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share text"
          onPress={() => void handleShare()}
          style={({ pressed }) => [styles.share, pressed && styles.bulletPressed]}
        >
          <Text style={styles.shareText}>Share text</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Delete from this phone' : 'Keep on this phone'}
          onPress={saved ? onDelete : onKeep}
          style={({ pressed }) => [styles.share, pressed && styles.bulletPressed]}
        >
          <Text style={styles.shareText}>{saved ? 'Delete' : 'Keep on this phone'}</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.transcriptHeader}>
        <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
        <Text style={styles.hint}>
          {activeIds.length > 0 ? 'Tap again to clear' : 'Tap a line above to see its source'}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
        nestedScrollEnabled
      >
        {note.segments.map((segment) => {
          const isActive = activeIds.includes(segment.id);
          return (
            <View
              key={segment.id}
              onLayout={(event) => {
                offsets.current[segment.id] = event.nativeEvent.layout.y;
              }}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentId, isActive && styles.segmentIdActive]}>{segment.id}</Text>
              <Text style={styles.segmentText}>{segment.text}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
  },
  kicker: {
    ...type.label,
    letterSpacing: 0.7,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...type.label,
    letterSpacing: 0.7,
    fontWeight: '600',
    color: colors.textMuted,
  },
  bullet: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    paddingLeft: spacing.sm,
    marginTop: spacing.xs,
    borderRadius: radii.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  bulletActive: {
    borderLeftColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  bulletPressed: {
    backgroundColor: colors.surfaceSunken,
  },
  bulletMark: {
    ...type.body,
    color: colors.textMuted,
  },
  bulletMarkActive: {
    color: colors.accent,
  },
  bulletText: {
    ...type.body,
    flex: 1,
    color: colors.text,
  },
  evidence: {
    ...type.small,
    color: colors.accent,
    fontVariant: ['tabular-nums'],
  },
  evidenceActive: {
    fontWeight: '700',
  },
  emptyLine: {
    ...type.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  share: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  shareText: {
    ...type.small,
    fontSize: 13,
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  hint: {
    ...type.label,
    color: colors.textMuted,
  },
  transcript: {
    maxHeight: TRANSCRIPT_MAX_HEIGHT,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSunken,
  },
  transcriptContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: colors.highlight,
  },
  segmentId: {
    ...type.small,
    minWidth: 18,
    textAlign: 'right',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
    paddingTop: 2,
  },
  segmentIdActive: {
    color: colors.text,
    fontWeight: '700',
  },
  segmentText: {
    ...type.small,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    color: colors.text,
  },
});
