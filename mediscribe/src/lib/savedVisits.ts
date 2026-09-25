import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { PrepNote, VisitNote } from '../types';

const STORAGE_KEY = 'mediscribe.savedVisits.v1';
const FILE_NAME = 'saved-visits.json';

export type SavedVisit =
  | { id: string; kind: 'visit'; savedAt: number; visitNote: VisitNote }
  | { id: string; kind: 'prep'; savedAt: number; prepNote: PrepNote };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isVisitNote(value: unknown): value is VisitNote {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.soap_note) &&
    Array.isArray(value.segments) &&
    Array.isArray(value.patient_summary) &&
    Array.isArray(value.checklist) &&
    Array.isArray(value.warnings)
  );
}

function isPrepNote(value: unknown): value is PrepNote {
  if (!isRecord(value) || !isRecord(value.brief) || !Array.isArray(value.segments)) return false;
  const brief = value.brief;
  return (
    Array.isArray(brief.symptoms) &&
    Array.isArray(brief.medicines) &&
    Array.isArray(brief.allergies) &&
    Array.isArray(brief.questions)
  );
}

function parseList(raw: string): SavedVisit[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const visits: SavedVisit[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.savedAt !== 'number') continue;
    if (entry.kind === 'visit' && isVisitNote(entry.visitNote)) {
      visits.push({
        id: entry.id,
        kind: 'visit',
        savedAt: entry.savedAt,
        visitNote: entry.visitNote,
      });
    } else if (entry.kind === 'prep' && isPrepNote(entry.prepNote)) {
      visits.push({
        id: entry.id,
        kind: 'prep',
        savedAt: entry.savedAt,
        prepNote: entry.prepNote,
      });
    }
  }
  return visits;
}

function readRaw(): string | null {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  }

  const file = new File(Paths.document, FILE_NAME);
  if (!file.exists) return null;
  return file.textSync();
}

function writeRaw(raw: string): void {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      throw new Error('This browser cannot store a visit on the device.');
    }
    localStorage.setItem(STORAGE_KEY, raw);
    return;
  }

  const file = new File(Paths.document, FILE_NAME);
  if (!file.exists) file.create();
  file.write(raw);
}

export async function loadSavedVisits(): Promise<SavedVisit[]> {
  const raw = readRaw();
  if (!raw) return [];
  return parseList(raw);
}

export async function saveVisit(visit: SavedVisit): Promise<void> {
  const current = await loadSavedVisits();
  const next = current.filter((item) => item.id !== visit.id);
  next.push(visit);
  writeRaw(JSON.stringify(next));
}

export async function deleteSavedVisit(id: string): Promise<void> {
  const current = await loadSavedVisits();
  writeRaw(JSON.stringify(current.filter((item) => item.id !== id)));
}
