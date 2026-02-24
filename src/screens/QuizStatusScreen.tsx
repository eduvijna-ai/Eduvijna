import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

interface QuizStatusScreenProps {
  route: {
    params: {
      status: 'not_found' | 'expired' | 'scheduled' | 'not_assigned' | 'already_completed' | 'error';
      title: string;
      message: string;
      icon: keyof typeof Ionicons.glyphMap;
      startTime?: string;
      endTime?: string;
      score?: string;
      completedAt?: string;
      quizId?: number;
      sessionId?: string;
    };
  };
  navigation: any;
}

export default function QuizStatusScreen({ route, navigation }: QuizStatusScreenProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { 
    status, 
    title, 
    message, 
    icon, 
    startTime, 
    endTime,
    score,
    completedAt,
    quizId,
    sessionId,
  } = route.params;

  // Handle Android hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Go back to previous screen in navigation stack
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // Fallback to Dashboard if no history
        navigation.navigate('Main', { screen: 'Dashboard' });
      }
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [navigation]);

  const getIconColor = () => {
    switch (status) {
      case 'not_found':
      case 'error':
        return '#F44336';
      case 'expired':
        return '#FF9800';
      case 'scheduled':
        return colors.primary;
      case 'not_assigned':
        return '#9E9E9E';
      case 'already_completed':
        return '#4CAF50';
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={80} color={getIconColor()} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {message}
          </Text>

          {/* Additional Info for Scheduled Quiz */}
          {status === 'scheduled' && startTime && endTime && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Start Time:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {startTime}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    End Time:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {endTime}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Additional Info for Expired Quiz */}
          {status === 'expired' && endTime && (
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Quiz ended on:
                  </Text>
                  <Text style={[styles.infoValue, { color: '#FF9800' }]}>
                    {endTime}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Additional Info for Already Completed */}
          {status === 'already_completed' && (
            <View style={styles.infoSection}>
              {score && (
                <View style={styles.scoreCard}>
                  <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                    Your Score
                  </Text>
                  <Text style={[styles.scoreValue, { color: '#4CAF50' }]}>
                    {score}
                  </Text>
                </View>
              )}
              {completedAt && (
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                  <View style={styles.infoText}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Completed on:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {completedAt}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {/* View Results Button (for completed quiz) */}
            {status === 'already_completed' && quizId && sessionId && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('QuizResultsScreen', { quizId, sessionId })}
              >
                <Ionicons name="stats-chart-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>View Results</Text>
              </TouchableOpacity>
            )}

            {/* Go to Assessments Button */}
            <TouchableOpacity
              style={[
                styles.button,
                status === 'already_completed' ? styles.secondaryButton : styles.primaryButton,
                status === 'already_completed' 
                  ? { borderColor: colors.primary, borderWidth: 2 }
                  : { backgroundColor: colors.primary }
              ]}
              onPress={() => {
                // Navigate to Assessments tab properly
                navigation.navigate('Main', {
                  screen: 'Assessments',
                });
              }}
            >
              <Ionicons 
                name="list-outline" 
                size={20} 
                color={status === 'already_completed' ? colors.primary : '#fff'} 
              />
              <Text style={[
                styles.buttonText,
                status === 'already_completed' && { color: colors.primary }
              ]}>
                Go to Assessments
              </Text>
            </TouchableOpacity>

            {/* Go Back Button */}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                // Go back to previous screen in navigation stack
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  // Fallback to Dashboard if no history
                  navigation.navigate('Main', {
                    screen: 'Dashboard',
                  });
                }
              }}
            >
              <Ionicons name="arrow-back-outline" size={20} color={colors.text} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  infoSection: {
    width: '100%',
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
