import { File as FileSystemFile } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Deletes a file the app wrote to its own cache.
 *
 * `expo-audio` writes each recording to disk, and the image picker copies the
 * chosen photo into the cache directory. Neither is needed once the upload has
 * been answered, and §7.5 of the PRD promises nothing outlives the session —
 * a cache that quietly accumulates consultation audio does not honour that.
 *
 * Best effort by design: a file that is already gone, or a web blob URL with no
 * filesystem behind it, is not a problem worth surfacing to the user.
 */
export function discardCachedFile(uri: string): void {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) return;

  try {
    const file = new FileSystemFile(uri);
    if (file.exists) file.delete();
  } catch {
    // Nothing actionable — the upload already succeeded or failed on its own terms.
  }
}
