/**
 * Test Notifications Screen
 * Use this to get your device token and test push notifications
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function TestNotifications({ navigation }: any) {
  const { theme } = useTheme();
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    registerForPushNotifications();
    
    // Listen for notifications received while app is open
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📩 Notification received:', notification);
      Alert.alert(
        'Notification Received!',
        JSON.stringify(notification.request.content, null, 2)
      );
    });

    // Listen for notification taps (when user clicks notification)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped:', response);
      handleNotificationTap(response.notification);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  /**
   * Handle notification tap - navigate to quiz
   */
  const handleNotificationTap = (notification: Notifications.Notification) => {
    const data = notification.request.content.data;
    console.log('📱 Notification data:', data);

    // Extract quiz information from notification data
    const quizId = data?.quiz_id || data?.quizId;
    const quizTitle = data?.quiz_title || data?.quizTitle;
    const notificationType = data?.type;

    if (quizId) {
      // Navigate to quiz preview/details screen
      Alert.alert(
        'Navigate to Quiz',
        `Opening quiz: ${quizTitle || quizId}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Quiz',
            onPress: () => {
              // Navigate to appropriate screen based on notification type
              if (notificationType === 'quiz_graded') {
                // Show results
                navigation.navigate('QuizResultsScreen', {
                  quizId,
                  studentId: data?.student_id,
                });
              } else {
                // Show quiz preview/details
                navigation.navigate('QuizPreviewScreen', {
                  quizId,
                });
              }
            },
          },
        ]
      );
    } else {
      // General notification - just show the data
      Alert.alert(
        'Notification',
        notification.request.content.body || 'No additional information',
        [{ text: 'OK' }]
      );
    }
  };

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        setPermissionStatus('❌ Must use physical device for push notifications');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPermissionStatus('❌ Permission denied');
        return;
      }

      setPermissionStatus('✅ Permission granted');

      // Get Expo Push Token (works without native rebuild)
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: '60acc689-aea1-4ce1-9770-4200c1c17c00'
      })).data;

      console.log('📱 Push Token:', token);
      setDeviceToken(token);

      // Configure Android channel
      if (Device.osName === 'Android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      setPermissionStatus('❌ Error: ' + (error as Error)?.message);
    }
  };

  const copyTokenToClipboard = async () => {
    if (!deviceToken) {
      Alert.alert('No Token', 'Device token not available yet');
      return;
    }

    // For expo, we can use Clipboard
    const Clipboard = require('@react-native-clipboard/clipboard').default;
    Clipboard.setString(deviceToken);
    Alert.alert('Copied!', 'Token copied to clipboard');
  };

  const sendTestNotification = async () => {
    try {
      // Schedule a local notification immediately with quiz data
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 New Quiz Available",
          body: 'Tap to view your Mathematics Quiz - Chapter 5!',
          data: { 
            type: 'quiz_assigned',
            quiz_id: 'test-quiz-123',
            quiz_title: 'Mathematics Quiz - Chapter 5',
            classroom_id: 'class-101',
            classroom_name: 'Grade 10 Math',
          },
        },
        trigger: null, // Immediate
      });

      Alert.alert('Success', 'Test notification sent! Tap it to test navigation.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification');
      console.error(error);
    }
  };

  const sendBackendTestNotification = async () => {
    Alert.alert(
      'Backend Test',
      'To test backend notifications:\n\n' +
      '1. Copy your token above\n' +
      '2. Send via Expo Push API:\n\n' +
      'POST https://exp.host/--/api/v2/push/send\n' +
      '{\n' +
      '  "to": "<EXPO_TOKEN>",\n' +
      '  "title": "New Quiz",\n' +
      '  "body": "Tap to view",\n' +
      '  "data": {\n' +
      '    "type": "quiz_assigned",\n' +
      '    "quiz_id": "123"\n' +
      '  }\n' +
      '}',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={48} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Push Notifications Test
        </Text>
      </View>

      {/* Permission Status */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Permission Status
        </Text>
        <Text style={[styles.statusText, { color: theme.colors.text }]}>
          {permissionStatus}
        </Text>
      </View>

      {/* Device Token */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Device Token
        </Text>
        <Text style={[styles.tokenLabel, { color: theme.colors.textSecondary }]}>
          Expo Push Token
        </Text>
        <ScrollView horizontal style={styles.tokenScroll}>
          <Text style={[styles.tokenText, { color: theme.colors.textSecondary }]}>
            {deviceToken || 'Getting token...'}
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={copyTokenToClipboard}
          disabled={!deviceToken}
        >
          <Ionicons name="copy" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Copy Token</Text>
        </TouchableOpacity>
      </View>

      {/* Test Actions */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Test Notifications
        </Text>

        <TouchableOpacity
          style={[styles.testButton, { borderColor: theme.colors.border }]}
          onPress={sendTestNotification}
        >
          <Ionicons name="phone-portrait" size={24} color="#10B981" />
          <View style={styles.testButtonText}>
            <Text style={[styles.testButtonTitle, { color: theme.colors.text }]}>
              Send Local Notification
            </Text>
            <Text style={[styles.testButtonDesc, { color: theme.colors.textSecondary }]}>
              Test notification without backend
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testButton, { borderColor: theme.colors.border }]}
          onPress={sendBackendTestNotification}
        >
          <Ionicons name="cloud" size={24} color="#3B82F6" />
          <View style={styles.testButtonText}>
            <Text style={[styles.testButtonTitle, { color: theme.colors.text }]}>
              Test Backend Notification
            </Text>
            <Text style={[styles.testButtonDesc, { color: theme.colors.textSecondary }]}>
              Instructions for backend team
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          How to Test
        </Text>
        <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
          1. Copy your Expo token above{'\n'}
          2. Give it to backend team{'\n'}
          3. Backend saves token: POST /api/v1/notifications/device/register{'\n'}
          4. Backend sends via Expo Push API{'\n'}
          5. Create a quiz to trigger notification{'\n'}
          6. You should receive notification on this device
        </Text>
      </View>

      {/* Device Info */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Device Info
        </Text>
        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
          Device: {Device.isDevice ? 'Physical Device ✅' : 'Emulator/Simulator ❌'}{'\n'}
          OS: {Device.osName} {Device.osVersion}{'\n'}
          Brand: {Device.brand}{'\n'}
          Model: {Device.modelName}{'\n'}
          Token Type: Expo Push Token
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  tokenLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  statusText: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  tokenScroll: {
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  testButtonText: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testButtonDesc: {
    fontSize: 13,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
