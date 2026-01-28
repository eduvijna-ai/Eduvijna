/**
 * Test Notifications Screen
 * Use this to get your Firebase FCM token and test push notifications
 * PRODUCTION: Uses only Firebase FCM, no Expo tokens
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';
import { useAuth } from '@core/hooks/useAuth';
import { getAccessToken } from '@core/services/tokenStorage';
import { PushNotificationService } from '@core/services/PushNotificationService';
import Constants from 'expo-constants';

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
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [backendTestLoading, setBackendTestLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string>('Not registered');
  const [isRegistered, setIsRegistered] = useState(false);


if (Constants.appOwnership === 'expo') {
  // Expo Go
  console.warn('FCM tokens are not supported in Expo Go');
  return null;
} else if (Constants.executionEnvironment === 'bare') {
  // Bare workflow
  console.log('Running in Bare workflow - FCM tokens supported');
} else {
  // Managed workflow
  console.log('Running in Managed workflow - FCM tokens supported via Expo');
}
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
      console.log('🔔 Starting FCM token registration...');

      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setPermissionStatus('❌ Permission denied');
        Alert.alert('Permission Denied', 'Please enable notifications in device settings');
        return;
      }

      setPermissionStatus('✅ Permission granted');
      console.log('✅ Permission granted');

      // Get push token using PushNotificationService
      const token = await PushNotificationService.getToken();
      
      if (!token) {
        Alert.alert(
          'Token Failed',
          'Could not get push token. Please check permissions.'
        );
        setFcmToken('❌ Push token unavailable');
        return;
      }

      const tokenType = fcmToken && fcmToken.startsWith('ExponentPushToken') ? 'Expo Push Token' : 'Native FCM Token';
      console.log(`✅ ${tokenType} obtained:`, token);
      setFcmToken(token);

      // Save to AsyncStorage
      await AsyncStorage.setItem('fcmDeviceToken', token);

      // Check if push is enabled and registered
      const pushStatus = await PushNotificationService.getPushStatus();
      if (pushStatus.isEnabled && pushStatus.hasToken) {
        setRegistrationStatus('✅ Registered with backend');
        setIsRegistered(true);
      } else {
        setRegistrationStatus('⚠️ Token obtained but not registered');
        setIsRegistered(false);
      }

      Alert.alert(
        'Token Generated!',
        `${tokenType} generated successfully!\n\nNext step: Click "Register with Backend" to enable push notifications.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      setPermissionStatus('❌ Error: ' + (error as Error)?.message);
      Alert.alert('Error', (error as Error)?.message || 'Failed to get FCM token');
    }
  };

  const copyTokenToClipboard = async () => {
    if (!fcmToken || fcmToken.startsWith('❌')) {
      Alert.alert('No Token', 'Push token not available yet. Click "Get FCM Token" first.');
      return;
    }

    const tokenType = fcmToken.startsWith('ExponentPushToken') ? 'Expo Push Token' : 'FCM Token';
    await Clipboard.setStringAsync(fcmToken);
    Alert.alert('Copied!', `${tokenType} copied to clipboard`);
  };

  const registerWithBackend = async () => {
    try {
      if (!fcmToken || fcmToken.startsWith('❌')) {
        Alert.alert('No Token', 'Please generate a token first by clicking "Get FCM Token"');
        return;
      }

      setRegistrationStatus('🔄 Registering...');
      console.log('📤 Registering token with backend...');

      // Enable push notifications (this registers the token)
      const result = await PushNotificationService.enablePushNotifications();

      if (result.success) {
        setRegistrationStatus('✅ Registered with backend');
        setIsRegistered(true);
        Alert.alert(
          '✅ Success!',
          'Push notifications enabled and token registered with backend!\n\nYou can now receive push notifications.',
          [{ text: 'OK' }]
        );
      } else {
        setRegistrationStatus('❌ Registration failed');
        setIsRegistered(false);
        Alert.alert(
          '❌ Registration Failed',
          result.message || 'Failed to register token with backend',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setRegistrationStatus('❌ Registration error');
      setIsRegistered(false);
      Alert.alert('Error', error.message || 'Failed to register with backend');
    }
  };

  const checkRegistrationStatus = async () => {
    try {
      const status = await PushNotificationService.getPushStatus();
      console.log('📊 Push status:', status);

      if (status.isEnabled && status.hasToken) {
        setRegistrationStatus('✅ Registered with backend');
        setIsRegistered(true);
      } else if (status.hasToken) {
        setRegistrationStatus('⚠️ Token exists but not registered');
        setIsRegistered(false);
      } else {
        setRegistrationStatus('❌ Not registered');
        setIsRegistered(false);
      }

      Alert.alert(
        'Registration Status',
        `Enabled: ${status.isEnabled ? 'Yes' : 'No'}\nHas Token: ${status.hasToken ? 'Yes' : 'No'}\nPermission: ${status.hasPermission ? 'Granted' : 'Denied'}\nSupported: ${status.isSupported ? 'Yes' : 'No'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ Error checking status:', error);
      Alert.alert('Error', 'Failed to check registration status');
    }
  };

  const sendTestNotification = async () => {
    try {
      // Schedule a local notification immediately with quiz data
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Eduvijna Test Notification ✅",
          body: 'Your quiz is ready. Tap to start!',
          data: { 
            type: 'QUIZ_READY',
            quiz_id: '12345',
            screen: 'QuizReadyStart',
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
    setBackendTestLoading(true);
    try {
      // Get auth token using the correct method
      const token = await getAccessToken();
      
      if (!token) {
        Alert.alert(
          'Authentication Required', 
          'Please login first to test backend notifications.\n\nToken not found in storage.'
        );
        setBackendTestLoading(false);
        return;
      }

      // Get user from hook
      if (!user || !user.id) {
        Alert.alert('Error', 'User information not found. Please login again.');
        setBackendTestLoading(false);
        return;
      }

      const userId = user.id;

      console.log('📤 Sending backend test notification...');
      console.log('User ID:', userId);
      console.log('User:', user.username || user.email);
      console.log('Token:', token.substring(0, 20) + '...');

      // Send test notification via backend API
      const response = await fetch('https://api.eduvijna.com/api/notifications/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: [userId],  // API expects array of user IDs
          title: '\ud83e\uddea Test Notification from Backend',
          body: 'If you see this, backend push notifications are working! \ud83c\udf89',
          priority: 'high',
          data: {
            type: 'QUIZ_READY',
            quiz_id: 'test-123',
            screen: 'QuizReadyStart',
          },
        }),
      });

      const responseText = await response.text();
      console.log('\ud83d\udcca Response status:', response.status);
      console.log('\ud83d\udcca Response body:', responseText);

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { message: responseText };
        }

        Alert.alert(
          '\u2705 Success!',
          `Backend notification sent successfully!\n\nStatus: ${response.status}\nMessage: ${result.message || 'Notification sent'}`,
          [{ text: 'OK' }]
        );
      } else {
        let errorMsg;
        try {
          const error = JSON.parse(responseText);
          errorMsg = error.detail || error.message || responseText;
        } catch (e) {
          errorMsg = responseText;
        }

        Alert.alert(
          '\u274c Error',
          `Failed to send notification\n\nStatus: ${response.status}\nError: ${errorMsg}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('\u274c Backend test error:', error);
      Alert.alert(
        'Error',
        `Failed to send backend notification:\n\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setBackendTestLoading(false);
    }
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

      {/* Registration Status */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Backend Registration Status
        </Text>
        <Text style={[styles.statusText, { color: theme.colors.text, marginBottom: 12 }]}>
          {registrationStatus}
        </Text>
        {!isRegistered && fcmToken && !fcmToken.startsWith('❌') && (
          <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, marginBottom: 12 }}>
            <Text style={{ color: '#92400E', fontSize: 13 }}>
              ⚠️ Token generated but not registered with backend.{' \n'}
              Click "Register with Backend" below to enable push notifications.
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: isRegistered ? '#10B981' : '#3B82F6' }]}
          onPress={checkRegistrationStatus}
        >
          <Ionicons name="information-circle" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Check Status</Text>
        </TouchableOpacity>
      </View>

      {/* Device Tokens */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          Push Notification Token
        </Text>
        
        {/* Push Token */}
        <Text style={[styles.tokenLabel, { color: theme.colors.textSecondary }]}>
          {fcmToken && fcmToken.startsWith('ExponentPushToken') ? '📱 Expo Push Token (Fallback)' : '🔥 Native FCM Token'}
        </Text>
        <ScrollView horizontal style={styles.tokenScroll}>
          <Text style={[styles.tokenText, { color: theme.colors.textSecondary }]}>
            {fcmToken || 'Click "Get FCM Token" to generate'}
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#FF9500' }]}
          onPress={copyTokenToClipboard}
          disabled={!fcmToken || fcmToken.startsWith('❌')}
        >
          <Ionicons name="copy" size={20} color="#FFF" />
          <Text style={styles.buttonText}>Copy Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isRegistered ? '#10B981' : '#3B82F6', marginTop: 8 }]}
          onPress={registerWithBackend}
          disabled={!fcmToken || fcmToken.startsWith('❌') || isRegistered}
        >
          <Ionicons name={isRegistered ? "checkmark-circle" : "cloud-upload"} size={20} color="#FFF" />
          <Text style={styles.buttonText}>
            {isRegistered ? 'Already Registered' : 'Register with Backend'}
          </Text>
        </TouchableOpacity>
        
        <View style={{ marginTop: 12, padding: 12, backgroundColor: fcmToken && fcmToken.startsWith('ExponentPushToken') ? '#FFF3CD' : '#D1FAE5', borderRadius: 8 }}>
          <Text style={{ color: fcmToken && fcmToken.startsWith('ExponentPushToken') ? '#856404' : '#065F46', fontSize: 12 }}>
            {fcmToken && fcmToken.startsWith('ExponentPushToken') 
              ? '⚠️ Using Expo Push Token as fallback.\nBackend can use Expo push service or convert to FCM.'
              : '✅ Native FCM token.\nBackend can use this directly with Firebase.'}
          </Text>
        </View>
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
          style={[styles.testButton, { borderColor: theme.colors.border, opacity: isRegistered ? 1 : 0.5 }]}
          onPress={sendBackendTestNotification}
          disabled={backendTestLoading || !isRegistered}
        >
          {backendTestLoading ? (
            <ActivityIndicator size={24} color="#3B82F6" />
          ) : (
            <Ionicons name="cloud" size={24} color={isRegistered ? "#3B82F6" : "#9CA3AF"} />
          )}
          <View style={styles.testButtonText}>
            <Text style={[styles.testButtonTitle, { color: theme.colors.text }]}>
              {backendTestLoading ? 'Sending...' : 'Test Backend Notification'}
            </Text>
            <Text style={[styles.testButtonDesc, { color: theme.colors.textSecondary }]}>
              {backendTestLoading ? 'Please wait...' : isRegistered ? 'Send via API endpoint' : 'Register token first'}
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
          <Text style={{ fontWeight: 'bold' }}>Step-by-Step:{' \n'}</Text>
          1. Click "Get FCM Token" to generate token{' \n'}
          2. Click "Register with Backend" to enable push{' \n'}
          3. Wait for confirmation{' \n'}
          4. Click "Test Backend Notification"{' \n'}
          5. Check your device for notification{' \n'}
          {' \n'}
          <Text style={{ fontWeight: 'bold' }}>Troubleshooting:{' \n'}</Text>
          • Check "Backend Registration Status" is ✅{' \n'}
          • Verify permission is granted{' \n'}
          • Check backend logs for errors{' \n'}
          • Try "Test Local Notification" first{' \n'}
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
          Push Token: {fcmToken && !fcmToken.includes('❌') ? '✅' : fcmToken.includes('❌') ? '❌' : '⏳'}{' ('}{fcmToken && fcmToken.startsWith('ExponentPushToken') ? 'Expo' : 'FCM'}{')'}
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
