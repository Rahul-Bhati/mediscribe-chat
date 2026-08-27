import { File as FileSystemFile } from 'expo-file-system';
import { Platform } from 'react-native';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';
import {
  SOAP_SECTIONS,
  type LabParameter,
  type LabReport,
  type LabStatus,
  type SoapNote,
  type VisitNote,
} from '../types';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const LAB_STATUSES: LabStatus[] = ['normal', 'high', 'low', 'unknown'];

/**
 * Builds a multipart body for a local file.
 *
 * The obvious React Native idiom — `form.append(field, { uri, name, type })` —
 * does not work here. Expo SDK 54+ replaces the global `fetch` with a WinterCG
 * implementation that rejects that shorthand outright ("Unsupported
 * FormDataPart implementation"), so the request never leaves the device. It
 * accepts a string, a real `Blob`, or any object exposing `bytes()`.
 *
 * `expo-file-system`'s `File` exposes `bytes()`, but it is not `instanceof
 * Blob`, so `append(..., filename)` will not attach a filename to it. Without a
 * filename in the content-disposition header multer treats the part as an
 * ordinary text field and `req.file` is never populated. Setting `name` on the
 * instance is what the converter actually reads.
 */
async function buildFileForm(
  field: string,
  uri: string,
  fallbackName: string
): Promise<FormData> {
  const form = new FormData();
  const name = uri.split('/').pop()?.split('?')[0] || fallbackName;

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((response) => response.blob());
    form.append(field, blob, name);
    return form;
  }

  const file = new FileSystemFile(uri);
  Object.defineProperty(file, 'name', { value: name, enumerable: true, configurable: true });

  form.append(field, file as unknown as Blob);
  return form;
}

/**
 * Uploads one file and narrows the response.
 *
 * Never throws and never rejects: every failure path — timeout, wrong LAN
 * address, server error, malformed body — comes back as `{ ok: false }` with
 * something a person can act on. A demo that fails silently is worse than one
 * that fails loudly.
 */
async function postFile<T>({
  path,
  field,
  uri,
  fallbackName,
  read,
  genericError,
}: {
  path: string;
  field: string;
  uri: string;
  fallbackName: string;
  read: (data: unknown) => T | null;
  genericError: string;
}): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const form = await buildFileForm(field, uri, fallbackName);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        error: `The server at ${API_BASE_URL} replied with something unreadable (HTTP ${response.status}).`,
      };
    }

    if ((body as { success?: unknown })?.success !== true) {
      const serverError = (body as { error?: unknown })?.error;
      return { ok: false, error: typeof serverError === 'string' ? serverError : genericError };
    }

    const data = read((body as { data?: unknown }).data);
    if (!data) return { ok: false, error: 'The server sent back something I could not read.' };

    return { ok: true, data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'That took too long. Check the server is still running.' };
    }

    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.warn(`[${path}] upload failed —`, detail);

    // fetch() rejects with a bare TypeError whether the host is unreachable or
    // the request body was malformed, so ask the server directly rather than
    // asserting a cause. Blaming the network when the network is fine sends you
    // looking in the wrong place for an hour.
    if (await isServerReachable()) {
      return {
        ok: false,
        error: `Reached the server at ${API_BASE_URL}, but the upload itself failed — ${detail}`,
      };
    }

    return {
      ok: false,
      error: `Could not reach the server at ${API_BASE_URL}. Check it is running and that the phone is on the same Wi-Fi.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Narrows an unknown payload to the note shape without trusting any of it. */
function readVisitNote(data: unknown): VisitNote | null {
  if (!data || typeof data !== 'object') return null;

  const { soap_note: rawNote, segments } = data as { soap_note?: unknown; segments?: unknown };
  if (!rawNote || typeof rawNote !== 'object' || !Array.isArray(segments)) return null;

  const soap_note = {} as SoapNote;
  for (const section of SOAP_SECTIONS) {
    const bullets = (rawNote as Record<string, unknown>)[section];
    soap_note[section] = Array.isArray(bullets) ? bullets : [];
  }

  return { soap_note, segments };
}

/** Same, for the lab report. A malformed row is dropped, never guessed at. */
function readLabReport(data: unknown): LabReport | null {
  if (!data || typeof data !== 'object') return null;

  const source = data as Record<string, unknown>;
  if (!Array.isArray(source.parameters)) return null;

  const parameters: LabParameter[] = source.parameters
    .map((row): LabParameter | null => {
      if (!row || typeof row !== 'object') return null;

      const entry = row as Record<string, unknown>;
      if (typeof entry.name !== 'string') return null;

      const status = entry.status as LabStatus;

      return {
        name: entry.name,
        value: typeof entry.value === 'string' ? entry.value : null,
        reference_range:
          typeof entry.reference_range === 'string' ? entry.reference_range : null,
        status: LAB_STATUSES.includes(status) ? status : 'unknown',
        meaning: typeof entry.meaning === 'string' ? entry.meaning : '',
      };
    })
    .filter((row): row is LabParameter => row !== null);

  return {
    report_type: typeof source.report_type === 'string' ? source.report_type : 'Lab report',
    parameters,
    abnormal_count:
      typeof source.abnormal_count === 'number'
        ? source.abnormal_count
        : parameters.filter((row) => row.status === 'high' || row.status === 'low').length,
    questions_for_doctor: Array.isArray(source.questions_for_doctor)
      ? source.questions_for_doctor.filter((q): q is string => typeof q === 'string')
      : [],
    disclaimer:
      typeof source.disclaimer === 'string'
        ? source.disclaimer
        : 'This is an automated explanation, not medical advice. Discuss these results with your doctor.',
  };
}

/** Uploads a recording and returns the structured SOAP note. */
export function processVoice(uri: string): Promise<ApiResult<VisitNote>> {
  return postFile({
    path: '/api/process-voice',
    field: 'audio',
    uri,
    fallbackName: 'recording.m4a',
    read: readVisitNote,
    genericError: 'The server could not process that recording.',
  });
}

/** Uploads a lab report photo or PDF and returns the plain-English breakdown. */
export function processDocument(uri: string, fallbackName: string): Promise<ApiResult<LabReport>> {
  return postFile({
    path: '/api/process-document',
    field: 'document',
    uri,
    fallbackName,
    read: readLabReport,
    genericError: 'The server could not read that document.',
  });
}

/** Short-timeout liveness probe, used only to explain a failure accurately. */
async function isServerReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
