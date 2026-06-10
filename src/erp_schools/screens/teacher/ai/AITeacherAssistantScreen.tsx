/** AI Teacher Assistant — prompt suggestions + chat thread (UI only). */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TeacherScreen, ScreenHeader, HeroCard } from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import type { ChatMessage } from '../../../types/domain';

const SUGGESTIONS: { key: string; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'plan', icon: 'document-text-outline', label: 'Draft a lesson plan' },
  { key: 'quiz', icon: 'help-circle-outline', label: 'Generate a quick quiz' },
  { key: 'summary', icon: 'sparkles-outline', label: 'Summarize class performance' },
  { key: 'message', icon: 'chatbubble-ellipses-outline', label: 'Write a parent message' },
];

export default function AITeacherAssistantScreen() {
  const theme = useTeacherTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: `me-${prev.length}`, text: trimmed, timeLabel: 'Now', fromMe: true },
      { id: `ai-${prev.length}`, text: 'Here is a draft based on your request. (AI responses are not connected yet.)', timeLabel: 'Now', fromMe: false },
    ]);
    setDraft('');
  };

  const hasChat = messages.length > 0;

  return (
    <TeacherScreen
      scroll={false}
      header={<ScreenHeader title="AI Assistant" trailingIcon="refresh-outline" onTrailingPress={() => setMessages([])} />}
      contentStyle={styles.flex}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!hasChat ? (
            <>
              <HeroCard>
                <View style={styles.heroRow}>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                  <Text style={styles.heroTitle}>Your Teaching Assistant</Text>
                </View>
                <Text style={styles.heroSub}>Ask me to plan lessons, draft messages, build quizzes and more.</Text>
              </HeroCard>

              <Text style={[styles.suggestTitle, { color: theme.colors.textSecondary }]}>Try asking</Text>
              <View style={styles.suggestGrid}>
                {SUGGESTIONS.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion.key}
                    style={[styles.suggestCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => send(suggestion.label)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.suggestIcon, { backgroundColor: theme.colors.tintTeal }]}>
                      <Ionicons name={suggestion.icon} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.suggestLabel, { color: theme.colors.textPrimary }]}>{suggestion.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            messages.map((message) => (
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
              </View>
            ))
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceAlt }]}
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask anything…"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]} onPress={() => send(draft)} accessibilityLabel="Send">
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  suggestTitle: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  suggestGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  suggestCard: { width: '48%', borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 14, gap: 10 },
  suggestIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  suggestLabel: { fontSize: 13, fontWeight: '600' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14, lineHeight: 19 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, borderRadius: 22, paddingHorizontal: 16, height: 44, fontSize: 15 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
