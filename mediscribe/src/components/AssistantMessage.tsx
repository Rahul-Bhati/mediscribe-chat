import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, type } from '../theme';

type Props = {
  text: string;
  isError?: boolean;
};

/**
 * The assistant speaks as plain text on the page, not inside a bubble. Only
 * the user's own turns get a container — that asymmetry is what makes the
 * reference design read as a document rather than a messaging app, and it is
 * what lets a SOAP note sit inline without looking boxed-in twice.
 */
export function AssistantMessage({ text, isError }: Props) {
  return (
    <View style={styles.container}>
      <Text style={[styles.text, isError && styles.error]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingRight: spacing.xl,
  },
  text: {
    ...type.body,
    color: colors.text,
  },
  error: {
    color: colors.accent,
  },
});
