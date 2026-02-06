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
  onNavigate?: (screen: string, params?: any) => void;
  isDark?: boolean;
  theme: any;
  showTitle?: boolean;
  onQuizTypePress?: (screen: string) => void;
}

export default function QuizGenerationGrid({ 
  navigation,
  onNavigate, 
  isDark = false, 
  theme,
  showTitle = true,
  onQuizTypePress 
}: QuizGenerationGridProps) {
  
  const handlePress = (screen: string) => {
    // Update the screen name to match the registered name in the navigation stack
    if (navigation?.navigate) {
      navigation.navigate(screen);
    } else if (onNavigate) {
      onNavigate(screen);
    } else if (onQuizTypePress) {
      onQuizTypePress(screen);
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
          onPress={() => handlePress('CreateAIQuizScreen')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#0891B2' }]}>
            <Ionicons name="bulb" size={20} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>AI Assessment</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Topic-based</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#FFE5F1' }]}
          onPress={() => handlePress('CreateDocumentQuizScreen')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#DC2626' }]}>
            <Ionicons name="document" size={20} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Document</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>PDF/Text</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#FFF3E0' }]}
          onPress={() => handlePress('CreateImageQuizScreen')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#D97706' }]}>
            <Ionicons name="image" size={20} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Image</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Photo/PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#E8F5E9' }]}
          onPress={() => handlePress('CreateYouTubeQuizScreen')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#059669' }]}>
            <Ionicons name="logo-youtube" size={20} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>YouTube</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>Video-based</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={[styles.quizOptionCard, { backgroundColor: isDark ? theme.colors.card : '#F3E5F5' }]}
          onPress={() => handlePress('CreateWebsiteQuizScreen')}
          activeOpacity={0.7}
        >
          <View style={[styles.quizOptionIcon, { backgroundColor: '#9C27B0' }]}>
            <Ionicons name="globe" size={28} color="#FFF" />
          </View>
          <Text style={[styles.quizOptionTitle, { color: theme.colors.text }]}>Website</Text>
          <Text style={[styles.quizOptionSubtitle, { color: theme.colors.textSecondary }]}>URL-based</Text>
        </TouchableOpacity> */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quizGenerationSection: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  sectionHeader: {
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
  },
  quizOptionsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quizOptionCard: {
    flex: 1,
    height: 70,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quizOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quizOptionTitle: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 1,
  },
  quizOptionSubtitle: {
    fontSize: 8,
    textAlign: 'center',
  },
});
