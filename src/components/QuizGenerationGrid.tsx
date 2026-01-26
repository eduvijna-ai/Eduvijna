/**
 * QuizGenerationGrid Component
 * 
 * Reusable grid of quiz creation options.
 * Used in: Dashboard screens, Assessments screen, and header modal
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuizGenerationGridProps {
  navigation?: any;
  isDark?: boolean;
  theme: any;
  showTitle?: boolean;
  onQuizTypePress?: (screen: string) => void;
}

export default function QuizGenerationGrid({ 
  navigation, 
  isDark = false, 
  theme,
  showTitle = true,
  onQuizTypePress 
}: QuizGenerationGridProps) {
  
  const handlePress = (screen: string) => {
    if (onQuizTypePress) {
      onQuizTypePress(screen);
    } else if (navigation) {
      navigation.navigate(screen as never);
    }
  };

  return (
    <View style={styles.quizGenerationSection}>
      {showTitle && (
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🧩 Generate Assessment
          </Text>
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
            Choose your preferred method
          </Text>
        </View>
      )}
      
      <View style={styles.quizOptionsGrid}>
        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#E3F2FD' }]}
          onPress={() => handlePress('CreateAIQuiz')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#0891B2' }]}>
            <Ionicons name="bulb" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>AI Prompt</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Topic-based</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#FFE5F1' }]}
          onPress={() => handlePress('CreateDocumentQuiz')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#DC2626' }]}>
            <Ionicons name="document" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Document</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>PDF/Text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#FFF3E0' }]}
          onPress={() => handlePress('CreateImageQuiz')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#D97706' }]}>
            <Ionicons name="image" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Image</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Photo/PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#E8F5E9' }]}
          onPress={() => handlePress('CreateYouTubeQuiz')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="logo-youtube" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>YouTube</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Video-based</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#F3E5F5' }]}
          onPress={() => handlePress('CreateWebsiteQuiz')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#9C27B0' }]}>
            <Ionicons name="globe" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Website</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>URL-based</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quizGenerationSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  quizOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  quizOptionCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quizOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quizOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  quizOptionSubtitle: {
    fontSize: 10,
    textAlign: 'center',
  },
});
