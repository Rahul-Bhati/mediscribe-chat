import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

/** Hard cap from the PRD: a visit snippet, not a lecture. */
export const MAX_RECORDING_MS = 120_000;

export type RecordingResult = {
  uri: string;
  durationMs: number;
};

type Options = {
  onFinish: (result: RecordingResult) => void;
  onError: (message: string) => void;
  onPermissionDenied: () => void;
};

/**
 * Tap-to-toggle microphone recording on top of `expo-audio`.
 *
 * Owns three things the UI needs: whether we are recording, how long for, and a
 * single `toggle()` entry point. Recording stops itself at
 * {@link MAX_RECORDING_MS} so a forgotten session can't run away.
 */
export function useVoiceRecorder({ onFinish, onError, onPermissionDenied }: Options) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startedAtRef = useRef(0);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Serialises the async start/stop transitions so a double-tap can't run either twice.
  const busyRef = useRef(false);
  const recordingRef = useRef(false);
  // Callbacks read through a ref so the auto-stop timer never fires a stale closure.
  const handlersRef = useRef({ onFinish, onError, onPermissionDenied });
  const stopRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    handlersRef.current = { onFinish, onError, onPermissionDenied };
  }, [onFinish, onError, onPermissionDenied]);

  const clearTimers = useCallback(() => {
    if (autoStopRef.current !== null) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const resetUiState = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);
    setElapsedMs(0);
  }, []);

  const stop = useCallback(async () => {
    if (busyRef.current || !recordingRef.current) return;
    busyRef.current = true;
    clearTimers();

    try {
      // Read the duration before stopping — the recorder's status resets on stop.
      const measuredMs = Math.round(recorder.getStatus()?.durationMillis ?? 0);
      const wallClockMs = Date.now() - startedAtRef.current;

      await recorder.stop();
      const uri = recorder.uri;
      resetUiState();

      // Hand the audio session back so playback elsewhere isn't stuck in record mode.
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});

      if (!uri) {
        handlersRef.current.onError("That recording didn't save. Try again?");
        return;
      }

      handlersRef.current.onFinish({
        uri,
        durationMs: Math.min(measuredMs > 0 ? measuredMs : wallClockMs, MAX_RECORDING_MS),
      });
    } catch (error) {
      resetUiState();
      handlersRef.current.onError(
        error instanceof Error ? error.message : "That recording didn't save. Try again?"
      );
    } finally {
      busyRef.current = false;
    }
  }, [clearTimers, recorder, resetUiState]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (busyRef.current || recordingRef.current) return;
    busyRef.current = true;

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        handlersRef.current.onPermissionDenied();
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();

      startedAtRef.current = Date.now();
      recordingRef.current = true;
      setElapsedMs(0);
      setIsRecording(true);

      tickRef.current = setInterval(() => {
        setElapsedMs(Math.min(Date.now() - startedAtRef.current, MAX_RECORDING_MS));
      }, 200);
      autoStopRef.current = setTimeout(() => {
        void stopRef.current();
      }, MAX_RECORDING_MS);
    } catch (error) {
      clearTimers();
      resetUiState();
      handlersRef.current.onError(
        error instanceof Error ? error.message : "Couldn't start the microphone."
      );
    } finally {
      busyRef.current = false;
    }
  }, [clearTimers, recorder, resetUiState]);

  const toggle = useCallback(() => {
    void (recordingRef.current ? stop() : start());
  }, [start, stop]);

  useEffect(
    () => () => {
      clearTimers();
      if (recordingRef.current) {
        recordingRef.current = false;
        recorder.stop().catch(() => {});
      }
    },
    [clearTimers, recorder]
  );

  return { isRecording, elapsedMs, toggle };
}
