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
import { SoapNoteBubble } from '../components/SoapNoteBubble';
import { SuggestionPills, type Suggestion } from '../components/SuggestionPills';
import { UserMessage } from '../components/UserMessage';
import { VoiceNoteBubble } from '../components/VoiceNoteBubble';
import { useVoiceRecorder, type RecordingResult } from '../hooks/useVoiceRecorder';
import { processDocument, processVoice } from '../lib/api';
import { discardCachedFile } from '../lib/files';
import { nextMessageId } from '../lib/format';
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
  text: 'Catch up before your next encounter. Record the visit and I will write the note, with every line linked back to what was said.',
  createdAt: new Date(),
  user: ASSISTANT,
};

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [text, setText] = useState('');
  const [stage, setStage] = useState<PipelineStage | null>(null);
  const { showActionSheetWithOptions } = useActionSheet();

  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (stageTimerRef.current !== null) clearTimeout(stageTimerRef.current);
    },
    []
  );

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
      append({
        _id: nextMessageId(),
        text: '',
        createdAt: new Date(),
        user: ME,
        voiceNote: recording,
      });

      setStage('transcribing');
      stageTimerRef.current = setTimeout(() => setStage('writing'), STAGE_HANDOVER_MS);

      const result = await processVoice(recording.uri);
      // The note and transcript live in memory from here; the audio does not
      // need to outlive the request (PRD §7.5).
      discardCachedFile(recording.uri);

      if (stageTimerRef.current !== null) {
        clearTimeout(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      setStage(null);

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
      { label: 'Record a visit', onPress: toggle },
      { label: 'Explain a lab report', onPress: handleAttach },
    ],
    [handleAttach, toggle]
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
          {message.visitNote ? <SoapNoteBubble note={message.visitNote} /> : null}
          {message.labReport ? <LabReportBubble report={message.labReport} /> : null}
          {message._id === WELCOME_ID && !isRecording ? (
            <SuggestionPills title="Try this" suggestions={suggestions} />
          ) : null}
        </>
      );

      return <View style={styles.messageRow}>{content}</View>;
    },
    [isRecording, suggestions]
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
            onToggleRecording={toggle}
            isRecording={isRecording}
            isBusy={stage !== null}
            elapsedMs={elapsedMs}
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
