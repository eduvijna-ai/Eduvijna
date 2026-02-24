/**
 * Push Notification Prompt Component
 * Shows a friendly alert/banner after login if push notifications are not enabled
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '@context/ThemeContext';

interface PushNotificationPromptProps {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
  loading?: boolean;
}

export default function PushNotificationPrompt({
  visible,
  onEnable,
  onDismiss,
  loading = false,
}: PushNotificationPromptProps) {
  const { theme, isDark } = useTheme();
  const colors = theme.colors;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.primary + '20' : '#EDE9FE' }]}>
            <Ionicons name="notifications-outline" size={48} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Enable Push Notifications</Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Get alerts for quizzes, reminders and updates. Stay connected with your classes and never miss important announcements.
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.benefitText, { color: colors.text }]}>New quiz assignments</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.benefitText, { color: colors.text }]}>Grade updates</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={[styles.benefitText, { color: colors.text }]}>Important reminders</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.enableButton, { backgroundColor: colors.primary }]}
              onPress={onEnable}
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner size={20} />
              ) : (
                <>
                  <Ionicons name="notifications" size={20} color="#fff" />
                  <Text style={styles.enableButtonText}>Enable</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.laterButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={onDismiss}
              disabled={loading}
            >
              <Text style={[styles.laterButtonText, { color: colors.textSecondary }]}>Maybe Later</Text>
            </TouchableOpacity>
          </View>

          {/* Info text */}
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You can change this anytime in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
    gap: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  enableButton: {
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  laterButton: {
    borderWidth: 1,
  },
  laterButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
