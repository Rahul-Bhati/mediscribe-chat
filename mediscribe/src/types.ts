import type { IMessage } from 'react-native-gifted-chat';

/**
 * A finished microphone recording, held only for the lifetime of the session.
 * Nothing is copied anywhere else; `uri` points at the file expo-audio wrote to
 * the app's cache directory.
 */
export type VoiceNote = {
  uri: string;
  durationMs: number;
};

export const SOAP_SECTIONS = ['subjective', 'objective', 'assessment', 'plan'] as const;
export type SoapSection = (typeof SOAP_SECTIONS)[number];

export const SECTION_LABELS: Record<SoapSection, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

/** One line of the note, plus the transcript segments that justify it. */
export type SoapBullet = {
  text: string;
  source_segment_ids: number[];
};

export type SoapNote = Record<SoapSection, SoapBullet[]>;

export type TranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

/** The payload of `POST /api/process-voice`, note plus the transcript it came from. */
export type VisitNote = {
  soap_note: SoapNote;
  segments: TranscriptSegment[];
};

export type LabStatus = 'normal' | 'high' | 'low' | 'unknown';

/** One row of the lab report. `null` means unreadable — never a guess. */
export type LabParameter = {
  name: string;
  value: string | null;
  reference_range: string | null;
  status: LabStatus;
  meaning: string;
};

export type LabReport = {
  report_type: string;
  parameters: LabParameter[];
  abnormal_count: number;
  questions_for_doctor: string[];
  disclaimer: string;
};

/** What the user attached, shown in their own turn while it uploads. */
export type Attachment = {
  uri: string;
  name: string;
  mimeType: string;
};

/**
 * `IMessage.audio` is typed as a plain URI string by gifted-chat, so the richer
 * payloads live under their own keys.
 */
export interface ChatMessage extends IMessage {
  voiceNote?: VoiceNote;
  visitNote?: VisitNote;
  attachment?: Attachment;
  labReport?: LabReport;
  isError?: boolean;
}

export const ME = { _id: 1, name: 'You' } as const;
export const ASSISTANT = { _id: 2, name: 'MediScribe' } as const;
