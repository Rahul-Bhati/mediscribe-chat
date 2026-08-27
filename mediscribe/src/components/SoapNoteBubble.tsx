import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';
import { SECTION_LABELS, SOAP_SECTIONS, type VisitNote } from '../types';

/**
 * Bounded so the transcript scrolls on its own rather than pushing the note
 * off screen. Tall enough to show roughly six lines of context around a hit.
 */
const TRANSCRIPT_MAX_HEIGHT = 260;

type Props = {
  note: VisitNote;
};

/**
 * The generated note, followed by the transcript it was drawn from.
 *
 * Tapping a bullet highlights the exact transcript segments that justify it and
 * scrolls the first one into view. This is the whole point of the demo: a
 * clinician will not sign a note they cannot audit, so every line has to point
 * back at the words behind it.
 */
export function SoapNoteBubble({ note }: Props) {
  // One source of truth. The selected bullet's key drives both its own styling
  // and which segments light up, so the two can never disagree.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeIds, setActiveIds] = useState<number[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  // Segment id -> y offset inside the transcript's content, captured on layout.
  const offsets = useRef<Record<number, number>>({});

  const sections = SOAP_SECTIONS.filter((section) => note.soap_note[section].length > 0);

  const handleBulletPress = useCallback(
    (key: string, ids: number[]) => {
      const isSame = activeKey === key;
      setActiveKey(isSame ? null : key);
      setActiveIds(isSame ? [] : ids);
    },
    [activeKey]
  );

  // Scrolling is a consequence of the selection, not of the tap: running it
  // here means the offsets have been measured and the highlight has painted
  // before the transcript moves.
  useEffect(() => {
    if (activeIds.length === 0) return;

    // Earliest cited segment, so the run of evidence reads top-down from there.
    const target = Math.min(...activeIds.map((id) => offsets.current[id] ?? 0));
    scrollRef.current?.scrollTo({ y: Math.max(0, target - spacing.sm), animated: true });
  }, [activeIds]);

  return (
    <View style={styles.root}>
      {sections.map((section) => (
        <View key={section} style={styles.section}>
          <Text style={styles.sectionLabel}>{SECTION_LABELS[section].toUpperCase()}</Text>

          {note.soap_note[section].map((bullet, index) => {
            const key = `${section}-${index}`;
            const isActive = activeKey === key;
            // A bullet the model gave no evidence for has nothing to reveal.
            const hasEvidence = bullet.source_segment_ids.length > 0;

            return (
              <Pressable
                key={key}
                disabled={!hasEvidence}
                onPress={() => handleBulletPress(key, bullet.source_segment_ids)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={
                  hasEvidence
                    ? `${bullet.text}. Tap to ${isActive ? 'hide' : 'show'} its source in the transcript.`
                    : bullet.text
                }
                style={({ pressed }) => [
                  styles.bullet,
                  isActive && styles.bulletActive,
                  pressed && hasEvidence && styles.bulletPressed,
                ]}
              >
                <Text style={[styles.bulletMark, isActive && styles.bulletMarkActive]}>•</Text>
                <Text style={styles.bulletText}>
                  {bullet.text}
                  {hasEvidence ? (
                    <Text style={[styles.evidence, isActive && styles.evidenceActive]}>
                      {'  '}
                      {bullet.source_segment_ids.map((id) => `[${id}]`).join(' ')}
                    </Text>
                  ) : null}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}

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
        // The transcript scrolls inside the chat list. iOS handles nested
        // scrolling natively; Android needs to be told.
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
              <Text style={[styles.segmentId, isActive && styles.segmentIdActive]}>
                {segment.id}
              </Text>
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
    // Reserved even when inactive so selecting a bullet does not shift the text.
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
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
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
    backgroundColor: 'transparent',
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
