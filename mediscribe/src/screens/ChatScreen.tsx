import { useActionSheet } from '@expo/react-native-action-sheet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { GiftedChat, type MessageProps } from 'react-native-gifted-chat';

import { AppHeader } from '../components/AppHeader';
import { AssistantMessage } from '../components/AssistantMessage';
import { AttachmentBubble } from '../components/AttachmentBubble';
import { ChatComposer } from '../components/ChatComposer';
import { LabReportBubble } from '../components/LabReportBubble';
import { PipelineIndicator, type PipelineStage } from '../components/PipelineIndicator';
import { PrepBriefBubble } from '../components/PrepBriefBubble';
import { SoapNoteBubble } from '../components/SoapNoteBubble';
import { SuggestionPills, type Suggestion } from '../components/SuggestionPills';
import { UserMessage } from '../components/UserMessage';
import { VoiceNoteBubble } from '../components/VoiceNoteBubble';
import { useVoiceRecorder, type RecordingResult } from '../hooks/useVoiceRecorder';
import { processDocument, processPrep, processVoice } from '../lib/api';
import { discardCachedFile } from '../lib/files';
import { nextMessageId } from '../lib/format';
import { deleteSavedVisit, loadSavedVisits, saveVisit, type SavedVisit } from '../lib/savedVisits';
import { pickLabReport, type PickSource } from '../lib/pickLabReport';
import { colors, spacing } from '../theme';
import { ASSISTANT, ME, type ChatMessage } from '../types';

const WELCOME_ID = 'welcome';

/**
 * Roughly when transcription hands over to note-writing, measured across ten
 * runs against the real backend. The server reports one result at the end, so
 * this is an honest estimate of the handover, not a progress signal.
 */
const STAGE_HANDOVER_MS = 2_500;

const WELCOME_MESSAGE: ChatMessage = {
  _id: WELCOME_ID,
  text: 'Catch up before your next encounter. Record the visit and I will write the note, a plain-language summary, a to-do list, and any warning signs the doctor stated. Every line links back to what was said. Nothing is saved unless you tap keep.',
  createdAt: new Date(),
  user: ASSISTANT,
};

function savedToMessage(item: SavedVisit): ChatMessage {
  if (item.kind === 'visit') {
    return {
      _id: item.id,
      text: 'Here is the note from that visit.',
      createdAt: new Date(item.savedAt),
      user: ASSISTANT,
      visitNote: item.visitNote,
      savedVisitId: item.id,
    };
  }
  return {
    _id: item.id,
    text: 'Here is the brief to hand over.',
    createdAt: new Date(item.savedAt),
    user: ASSISTANT,
    prepNote: item.prepNote,
    savedVisitId: item.id,
  };
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [text, setText] = useState('');
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const { showActionSheetWithOptions } = useActionSheet();

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingModeRef = useRef<'visit' | 'prep'>('visit');
  const [recordingMode, setRecordingMode] = useState<'visit' | 'prep'>('visit');

  useEffect(
    () => () => {
      if (stageTimerRef.current !== null) clearTimeout(stageTimerRef.current);
    },
    []
  );

  useEffect(() => {
    let active = true;
    loadSavedVisits()
      .then((saved) => {
        if (!active || saved.length === 0) return;
        setMessages((previous) => {
          const known = new Set(previous.map((message) => String(message._id)));
          const restored = saved
            .filter((item) => !known.has(item.id))
            .sort((a, b) => b.savedAt - a.savedAt)
            .map(savedToMessage);
          if (restored.length === 0) return previous;
          const welcomeIndex = previous.findIndex((message) => message._id === WELCOME_ID);
          if (welcomeIndex === -1) return [...restored, ...previous];
          const next = [...previous];
          next.splice(welcomeIndex, 0, ...restored);
          return next;
        });
      })
      .catch(() => {
        // A missing or unreadable local file just means there is nothing to restore.
      });
    return () => {
      active = false;
    };
  }, []);

  const append = useCallback((message: ChatMessage) => {
    setMessages((previous) => GiftedChat.append(previous, [message]));
  }, []);

  const appendAssistant = useCallback(
    (fields: Partial<ChatMessage> & { text: string }) => {
      append({
        _id: nextMessageId(),
        createdAt: new Date(),
        user: ASSISTANT,
        ...fields,
      });
    },
    [append]
  );

  const handleRecordingFinished = useCallback(
    async (recording: RecordingResult) => {
      const mode = recordingModeRef.current;
      recordingModeRef.current = 'visit';
      setRecordingMode('visit');

      append({
        _id: nextMessageId(),
        text: '',
        createdAt: new Date(),
        user: ME,
        voiceNote: recording,
      });

      setStage('transcribing');
      stageTimerRef.current = setTimeout(
        () => setStage(mode === 'prep' ? 'briefing' : 'writing'),
        STAGE_HANDOVER_MS
      );

      const finishStage = () => {
        if (stageTimerRef.current !== null) {
          clearTimeout(stageTimerRef.current);
          stageTimerRef.current = null;
        }
        setStage(null);
      };

      // The note and transcript live in memory from here; the audio does not
      // need to outlive the request (PRD §7.5).
      if (mode === 'prep') {
        const result = await processPrep(recording.uri);
        discardCachedFile(recording.uri);
        finishStage();
        if (result.ok) {
          appendAssistant({ text: 'Here is the brief to hand over.', prepNote: result.data });
        } else {
          appendAssistant({ text: result.error, isError: true });
        }
        return;
      }

      const result = await processVoice(recording.uri);
      discardCachedFile(recording.uri);
      finishStage();
      if (result.ok) {
        appendAssistant({ text: 'Here is the note from that visit.', visitNote: result.data });
        return;
      }
      appendAssistant({ text: result.error, isError: true });
    },
    [append, appendAssistant]
  );

  const handleRecordingError = useCallback((message: string) => {
    Alert.alert('Recording failed', message);
  }, []);

  const handlePermissionDenied = useCallback(() => {
    Alert.alert(
      'Microphone access needed',
      'MediScribe needs the microphone to record the visit. Enable it in Settings, then tap the mic again.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]
    );
  }, []);

  const { isRecording, elapsedMs, toggle } = useVoiceRecorder({
    onFinish: handleRecordingFinished,
    onError: handleRecordingError,
    onPermissionDenied: handlePermissionDenied,
  });

  const startRecording = useCallback(
    (mode: 'visit' | 'prep') => {
      if (isRecording || stage !== null) return;
      recordingModeRef.current = mode;
      setRecordingMode(mode);
      toggle();
    },
    [isRecording, stage, toggle]
  );

  const handleMic = useCallback(() => {
    if (!isRecording) {
      recordingModeRef.current = 'visit';
      setRecordingMode('visit');
    }
    toggle();
  }, [isRecording, toggle]);

  const keepOnPhone = useCallback(async (message: ChatMessage) => {
    if (message.savedVisitId) return;
    const id = `kept-${String(message._id)}-${Date.now()}`;
    try {
      if (message.visitNote) {
        await saveVisit({ id, kind: 'visit', savedAt: Date.now(), visitNote: message.visitNote });
      } else if (message.prepNote) {
        await saveVisit({ id, kind: 'prep', savedAt: Date.now(), prepNote: message.prepNote });
      } else {
        return;
      }
    } catch {
      Alert.alert('Could not keep this', 'It is still on the screen, but it was not stored on this phone.');
      return;
    }
    setMessages((previous) =>
      previous.map((item) => (item._id === message._id ? { ...item, savedVisitId: id } : item))
    );
  }, []);

  const deleteFromPhone = useCallback((message: ChatMessage) => {
    if (!message.savedVisitId) return;
    const savedId = message.savedVisitId;
    Alert.alert('Delete this visit?', 'It will be removed from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteSavedVisit(savedId)
            .then(() => {
              setMessages((previous) => previous.filter((item) => item.savedVisitId !== savedId));
            })
            .catch(() => {
              Alert.alert('Could not delete this', 'It is still stored on this phone.');
            });
        },
      },
    ]);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setText('');
    append({
      _id: nextMessageId(),
      text: trimmed,
      createdAt: new Date(),
      user: ME,
    });
  }, [append, text]);

  const runDocument = useCallback(
    async (source: PickSource) => {
      const picked = await pickLabReport(source);

      if (picked.status === 'cancelled') return;
      if (picked.status === 'denied') {
        Alert.alert('Permission needed', picked.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]);
        return;
      }

      const { attachment } = picked;
      append({
        _id: nextMessageId(),
        text: '',
        createdAt: new Date(),
        user: ME,
        attachment,
      });

      setStage('reading');
      const result = await processDocument(attachment.uri, attachment.name);
      setStage(null);

      if (result.ok) {
        appendAssistant({
          text: 'Here is what that report says, in plain English.',
          labReport: result.data,
        });
        return;
      }

      appendAssistant({ text: result.error, isError: true });
    },
    [append, appendAssistant]
  );

  const handleAttach = useCallback(() => {
    const options = ['Take photo', 'Choose image', 'Choose PDF', 'Cancel'];
    const sources: PickSource[] = ['camera', 'library', 'pdf'];

    showActionSheetWithOptions(
      { options, cancelButtonIndex: 3, title: 'Add a lab report' },
      (index) => {
        if (index === undefined || index === 3) return;
        void runDocument(sources[index]);
      }
    );
  }, [runDocument, showActionSheetWithOptions]);

  const suggestions = useMemo<Suggestion[]>(
    () => [
      { label: 'Record a visit', onPress: () => startRecording('visit') },
      { label: 'Prepare for a visit', onPress: () => startRecording('prep') },
      { label: 'Explain a lab report', onPress: handleAttach },
    ],
    [handleAttach, startRecording]
  );

  /**
   * Replaces gifted-chat's Message wrapper outright. Its default row caps a
   * turn at 70% of the width, which is right for bubbles and wrong for an
   * assistant that writes full-width prose.
   */
  const renderMessage = useCallback(
    (props: MessageProps<ChatMessage>) => {
      const message = props.currentMessage;

      const content = message.voiceNote ? (
        <VoiceNoteBubble voiceNote={message.voiceNote} />
      ) : message.attachment ? (
        <AttachmentBubble attachment={message.attachment} />
      ) : message.user._id === ME._id ? (
        <UserMessage text={message.text} />
      ) : (
        <>
          <AssistantMessage text={message.text} isError={message.isError} />
          {message.visitNote ? (
            <SoapNoteBubble
              note={message.visitNote}
              saved={Boolean(message.savedVisitId)}
              onKeep={() => void keepOnPhone(message)}
              onDelete={() => deleteFromPhone(message)}
            />
          ) : null}
          {message.prepNote ? (
            <PrepBriefBubble
              note={message.prepNote}
              saved={Boolean(message.savedVisitId)}
              onKeep={() => void keepOnPhone(message)}
              onDelete={() => deleteFromPhone(message)}
            />
          ) : null}
          {message.labReport ? <LabReportBubble report={message.labReport} /> : null}
          {message._id === WELCOME_ID && !isRecording ? (
            <SuggestionPills title="Try this" suggestions={suggestions} />
          ) : null}
        </>
      );

      return <View style={styles.messageRow}>{content}</View>;
    },
    [deleteFromPhone, isRecording, keepOnPhone, suggestions]
  );

  return (
    <View style={styles.container}>
      <AppHeader />
      <GiftedChat<ChatMessage>
        messages={messages}
        user={ME}
        renderAvatar={null}
        renderMessage={renderMessage}
        renderDay={() => null}
        renderTime={() => null}
        renderFooter={() => (stage ? <PipelineIndicator stage={stage} /> : null)}
        messagesContainerStyle={styles.messages}
        // The header sits outside GiftedChat, so its default status-bar offset
        // would push the composer too far up when the keyboard opens.
        keyboardAvoidingViewProps={{ keyboardVerticalOffset: 0 }}
        renderInputToolbar={() => (
          <ChatComposer
            text={text}
            onChangeText={setText}
            onSend={handleSend}
            onAttach={handleAttach}
            onToggleRecording={handleMic}
            isRecording={isRecording}
            isBusy={stage !== null}
            elapsedMs={elapsedMs}
            recordingHint={recordingMode === 'prep' ? 'Preparing' : 'Listening'}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  messages: {
    backgroundColor: colors.paper,
    paddingTop: spacing.sm,
  },
  messageRow: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
});
