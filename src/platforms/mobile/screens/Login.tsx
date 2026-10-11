/**
 * Mobile Login Screen
 * Platform: React Native (iOS/Android)
 */

import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import { logError } from '@core/services/errorLogger';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function Login() {
  const { login, isLoggingIn, error, clearError } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const acceptanceAdbLogin = Constants.expoConfig?.extra?.ACCEPTANCE_ADB_LOGIN === true;

  const onLogin = async () => {
    clearError();

    try {
      await login({ email: email.trim(), password });
    } catch (e: unknown) {
      void logError(e, 'LoginScreen.onLogin');
    }
  };

  useEffect(() => {
    if (!acceptanceAdbLogin) return;
    let cancelled = false;
    const acceptancePath = `${FileSystem.documentDirectory}acceptance-login.json`;

    const consumeAcceptanceFile = async () => {
      const info = await FileSystem.getInfoAsync(acceptancePath);
      if (!info.exists) return;
      const raw = await FileSystem.readAsStringAsync(acceptancePath);
      await FileSystem.deleteAsync(acceptancePath, { idempotent: true });
      const parsed = JSON.parse(raw) as { username?: string; password?: string };
      const username = parsed.username?.trim();
      const password = parsed.password ?? '';
      if (!username || !password || cancelled) return;
      setEmail(username);
      await login({ email: username, password });
    };

    const timer = setInterval(() => {
      void consumeAcceptanceFile().catch((e: unknown) => {
        void logError(e, 'LoginScreen.acceptanceFileLogin');
      });
    }, 750);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [acceptanceAdbLogin, login]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image source={require('../../../../assets/eduvijna.png')} style={styles.logo} />
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            testID="login-email-input"
            accessibilityLabel="Email or Username"
            placeholder="Email or Username"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            {...(acceptanceAdbLogin ? {} : { value: email })}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            editable={!isLoggingIn}
          />

          <TextInput
            testID="login-password-input"
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            {...(acceptanceAdbLogin ? {} : { value: password })}
            onChangeText={setPassword}
            autoCapitalize="none"
            textContentType="password"
            editable={!isLoggingIn}
            onSubmitEditing={onLogin}
            returnKeyType="go"
          />

          <TouchableOpacity
            testID="login-submit-button"
            accessibilityLabel="Sign in"
            style={[styles.button, { backgroundColor: colors.primary }, isLoggingIn && styles.buttonDisabled]}
            onPress={onLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <LoadingSpinner size={24} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  logo: { 
    width: 150, 
    height: 120, 
    marginBottom: 12,
  },
  input: { 
    width: '100%', 
    padding: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderRadius: 8, 
  },
  error: { 
    color: '#DC2626', 
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

