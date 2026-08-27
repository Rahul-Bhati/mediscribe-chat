import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';

type Props = {
  text: string;
};

/** The user's own turn: a soft tan pill, right-aligned. */
export function UserMessage({ text }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{text}</Text>
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
    flexShrink: 1,
    maxWidth: '85%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.userBubble,
  },
  text: {
    ...type.body,
    color: colors.userBubbleText,
  },
});
