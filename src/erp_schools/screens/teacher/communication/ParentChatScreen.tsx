/** Parent Chat — message thread with a parent (UI only). */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { TeacherScreen, ScreenHeader } from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { conversations, chatThreads } from '../../../data';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { ChatMessage } from '../../../types/domain';

export default function ParentChatScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ParentChat'>>();
  const conversationId = route.params?.conversationId ?? 'cv1';
  const conversation = conversations.find((c) => c.id === conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(chatThreads[conversationId] ?? []);
  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: `local-${prev.length}`, text: draft.trim(), timeLabel: 'Now', fromMe: true }]);
    setDraft('');
  };

  return (
    <TeacherScreen
      scroll={false}
      header={<ScreenHeader title={conversation?.parentName ?? 'Chat'} trailingIcon="call-outline" />}
      contentStyle={styles.flex}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.thread}>
          {conversation ? (
            <Text style={[styles.context, { color: theme.colors.textSecondary }]}>
              Regarding {conversation.studentName}{conversation.studentRollNo ? ` (${conversation.studentRollNo})` : ''}
            </Text>
          ) : null}
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.fromMe
                  ? { backgroundColor: theme.colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 }
                  : { backgroundColor: theme.colors.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <Text style={[styles.bubbleText, { color: message.fromMe ? '#FFFFFF' : theme.colors.textPrimary }]}>{message.text}</Text>
              <Text style={[styles.bubbleTime, { color: message.fromMe ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }]}>{message.timeLabel}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceAlt }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]} onPress={send} accessibilityLabel="Send message">
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  thread: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  context: { fontSize: 12, textAlign: 'center', marginBottom: 4 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  bubbleTime: { fontSize: 10, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, height: 44, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
