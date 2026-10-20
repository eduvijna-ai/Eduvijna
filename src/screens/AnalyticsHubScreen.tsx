/**
 * Analytics Hub — routes users to the correct analytics module by role.
 * Mirrors Quiz-React: /analytics (teacher/admin) vs /student-analytics (student)
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '../core/hooks/useAuth';
import { usesTeacherAssessmentClassroomPath } from '../core/services/assessmentClassrooms.service';
import QuizTeacherAnalyticsScreen from './QuizTeacherAnalyticsScreen';
import QuizStudentMyAnalyticsScreen from './QuizStudentMyAnalyticsScreen';

function isTeacherRole(role?: string | null): boolean {
  return usesTeacherAssessmentClassroomPath(role);
}

export default function AnalyticsHubScreen() {
  const { user, isInitializing } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;

  if (isInitializing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.msg, { color: colors.textSecondary }]}>Please sign in to view analytics.</Text>
      </View>
    );
  }

  if (isTeacherRole(user.role)) {
    return <QuizTeacherAnalyticsScreen />;
  }

  return <QuizStudentMyAnalyticsScreen />;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { fontSize: 14, textAlign: 'center' },
});
