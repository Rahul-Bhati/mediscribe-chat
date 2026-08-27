import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, type } from '../theme';
import type { Attachment } from '../types';

type Props = {
  attachment: Attachment;
};

/** The user's own turn when they attach a lab report: a thumbnail, or a file chip for a PDF. */
export function AttachmentBubble({ attachment }: Props) {
  const isImage = attachment.mimeType.startsWith('image/');

  return (
    <View style={styles.row}>
      <View style={styles.bubble}>
        {isImage ? (
          // `contain`, not `cover`: cropping a lab report to fill a square hides
          // the very rows the user wants to check was picked up.
          <Image source={{ uri: attachment.uri }} style={styles.thumbnail} resizeMode="contain" />
        ) : (
          <View style={styles.fileRow}>
            <Ionicons name="document-text-outline" size={18} color={colors.userBubbleText} />
            <Text style={styles.fileName} numberOfLines={1}>
              {attachment.name}
            </Text>
          </View>
        )}
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
    maxWidth: '75%',
    borderRadius: radii.md,
    backgroundColor: colors.userBubble,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 180,
    height: 230,
    backgroundColor: colors.surface,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  fileName: {
    ...type.small,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.userBubbleText,
  },
});
