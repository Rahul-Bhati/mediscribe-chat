import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';
import type { LabParameter, LabReport, LabStatus } from '../types';

type Props = {
  report: LabReport;
};

const STATUS_LABEL: Record<LabStatus, string> = {
  normal: 'Normal',
  high: 'High',
  low: 'Low',
  unknown: 'Unclear',
};

/**
 * The lab report broken down for a patient.
 *
 * Out-of-range rows are tinted, but deliberately not in red-means-danger terms:
 * the prompt forbids the model from saying whether to worry, and the styling
 * should not say it either. A number outside a range is a fact worth noticing
 * and a question for a doctor, not a verdict.
 */
export function LabReportBubble({ report }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.reportType}>{report.report_type}</Text>
        <Text style={styles.summary}>
          {report.parameters.length} value{report.parameters.length === 1 ? '' : 's'}
          {report.abnormal_count > 0 ? ` · ${report.abnormal_count} outside range` : ' · all in range'}
        </Text>
      </View>

      <View style={styles.table}>
        {report.parameters.map((parameter, index) => (
          <ParameterRow
            key={`${parameter.name}-${index}`}
            parameter={parameter}
            isLast={index === report.parameters.length - 1}
          />
        ))}
      </View>

      {report.questions_for_doctor.length > 0 ? (
        <View style={styles.questions}>
          <Text style={styles.sectionLabel}>QUESTIONS FOR YOUR DOCTOR</Text>
          {report.questions_for_doctor.map((question, index) => (
            <View key={index} style={styles.question}>
              <Text style={styles.questionMark}>{index + 1}</Text>
              <Text style={styles.questionText}>{question}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.disclaimer}>{report.disclaimer}</Text>
    </View>
  );
}

function ParameterRow({ parameter, isLast }: { parameter: LabParameter; isLast: boolean }) {
  const isAbnormal = parameter.status === 'high' || parameter.status === 'low';
  const isUnknown = parameter.status === 'unknown';

  return (
    <View style={[styles.row, isAbnormal && styles.rowAbnormal, !isLast && styles.rowDivider]}>
      <View style={styles.rowHeader}>
        <Text style={styles.name}>{parameter.name}</Text>
        <View
          style={[
            styles.badge,
            isAbnormal && styles.badgeAbnormal,
            isUnknown && styles.badgeUnknown,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isAbnormal && styles.badgeTextAbnormal,
              isUnknown && styles.badgeTextUnknown,
            ]}
          >
            {STATUS_LABEL[parameter.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.value}>
        {parameter.value ?? 'Not readable'}
        {parameter.reference_range ? (
          <Text style={styles.range}>{`   ref ${parameter.reference_range}`}</Text>
        ) : null}
      </Text>

      {parameter.meaning ? <Text style={styles.meaning}>{parameter.meaning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  reportType: {
    ...type.body,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    ...type.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  table: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowAbnormal: {
    backgroundColor: colors.outOfRange,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...type.body,
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
  },
  badgeAbnormal: {
    backgroundColor: colors.accentSoft,
  },
  badgeUnknown: {
    backgroundColor: colors.surfaceSunken,
  },
  badgeText: {
    ...type.label,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badgeTextAbnormal: {
    color: colors.accent,
  },
  badgeTextUnknown: {
    color: colors.textMuted,
  },
  value: {
    ...type.small,
    fontSize: 13,
    color: colors.text,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  range: {
    color: colors.textMuted,
  },
  meaning: {
    ...type.small,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  questions: {
    marginTop: spacing.lg,
  },
  sectionLabel: {
    ...type.label,
    letterSpacing: 0.7,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  question: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  questionMark: {
    ...type.small,
    minWidth: 14,
    color: colors.accent,
    fontWeight: '700',
  },
  questionText: {
    ...type.small,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  disclaimer: {
    ...type.label,
    color: colors.textMuted,
    marginTop: spacing.lg,
    fontStyle: 'italic',
  },
});
