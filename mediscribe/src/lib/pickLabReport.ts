import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import type { Attachment } from '../types';

export type PickSource = 'camera' | 'library' | 'pdf';

export type PickResult =
  | { status: 'picked'; attachment: Attachment }
  | { status: 'cancelled' }
  | { status: 'denied'; message: string };

/** Derives a mime type from the file extension when the picker doesn't give one. */
function guessMimeType(uri: string, fallback: string): string {
  const extension = uri.split('.').pop()?.toLowerCase().split('?')[0];

  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return fallback;
  }
}

/**
 * Opens the camera, the photo library, or the file browser and returns one lab
 * report to upload.
 *
 * Images are capped in size before they leave the device: a modern phone camera
 * produces a file large enough to be slow to upload and slow for the model to
 * read, with no gain in legibility.
 */
export async function pickLabReport(source: PickSource): Promise<PickResult> {
  if (source === 'pdf') {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

    const asset = result.assets[0];
    return {
      status: 'picked',
      attachment: {
        uri: asset.uri,
        name: asset.name || 'report.pdf',
        mimeType: asset.mimeType || 'application/pdf',
      },
    };
  }

  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return {
      status: 'denied',
      message:
        source === 'camera'
          ? 'MediScribe needs camera access to photograph a lab report. Enable it in Settings.'
          : 'MediScribe needs photo access to read a lab report. Enable it in Settings.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || !result.assets?.[0]) return { status: 'cancelled' };

  const asset = result.assets[0];
  return {
    status: 'picked',
    attachment: {
      uri: asset.uri,
      name: asset.fileName || 'lab-report.jpg',
      mimeType: asset.mimeType || guessMimeType(asset.uri, 'image/jpeg'),
    },
  };
}
