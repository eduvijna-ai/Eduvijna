/**
 * AI Tutor — entry point to AI-assisted learning (ask doubts, practice, quiz).
 * Derived from the Home "AI Learning Assistant" card (screens.md "AI Tutor").
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  StudentModuleHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  QuickActionGrid,
  ListItem,
  InfoBanner,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useStudentNavigation } from '../../../hooks/useStudentNavigation';

const RECENT = [
  { id: 'c1', title: 'Explain Photosynthesis', subtitle: 'Science • 2h ago', icon: 'flask-outline' as const, accent: 'green' as const },
  { id: 'c2', title: 'Solve: 2x + 5 = 15', subtitle: 'Mathematics • Yesterday', icon: 'calculator-outline' as const, accent: 'orange' as const },
  { id: 'c3', title: 'Summarize Chapter 3', subtitle: 'Social Science • 2 days ago', icon: 'globe-outline' as const, accent: 'purple' as const },
];

export default function AITutorScreen() {
  const theme = useTeacherTheme();
  const navigation = useStudentNavigation();
  const [prompt, setPrompt] = useState('');

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('StudentTabs', { screen: 'StudentHome' });
  };

  const actions: QuickAction[] = [
    { key: 'doubt', icon: 'help-circle-outline', label: 'Ask a Doubt', accent: 'blue', onPress: () => undefined },
    { key: 'explain', icon: 'bulb-outline', label: 'Explain a Topic', accent: 'orange', onPress: () => undefined },
    { key: 'practice', icon: 'create-outline', label: 'Practice Test', accent: 'green', onPress: () => navigation.navigate('AIPracticeTest') },
    { key: 'quiz', icon: 'game-controller-outline', label: 'AI Quiz', accent: 'purple', onPress: () => navigation.navigate('AIQuiz', {}) },
  ];

  return (
    <TeacherScreen
      header={<StudentModuleHeader title="AI Tutor" onBack={handleBack} />}
      contentStyle={styles.content}
    >
      <HeroCard>
        <View style={styles.heroHead}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Hi, I&apos;m your AI Tutor</Text>
            <Text style={styles.heroSub}>Ask me anything — I&apos;ll explain, practice and quiz with you.</Text>
          </View>
        </View>
      </HeroCard>

      <SurfaceCard>
        <View style={styles.askRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.askInput, { color: theme.colors.textPrimary }]}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Type your question…"
            placeholderTextColor={theme.colors.textSecondary}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="What can I help with?" />
        <QuickActionGrid actions={actions} columns={4} />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent Conversations" />
        <SurfaceCard padded={false} style={styles.listCard}>
          {RECENT.map((item, index) => (
            <ListItem
              key={item.id}
              icon={item.icon}
              iconAccent={item.accent}
              title={item.title}
              subtitle={item.subtitle}
              divider={index < RECENT.length - 1}
              showChevron
            />
          ))}
        </SurfaceCard>
      </View>

      <InfoBanner tone="tip" text="AI answers are for learning support. Always verify with your teacher and textbook." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 4, lineHeight: 17 },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  askInput: { flex: 1, fontSize: 15, padding: 0 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 0 },
  listCard: { paddingHorizontal: 14 },
});
