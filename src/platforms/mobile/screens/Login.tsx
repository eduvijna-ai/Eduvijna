/**
 * Mobile Login Screen
 * Platform: React Native (iOS/Android)
 * Engineering diagnostics: loginDiagnostics.ts (__DEV__ only).
 */

import React, { useCallback, useRef, useState } from 'react';
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
  type NativeSyntheticEvent,
  type TextInput as TextInputType,
  type TextInputChangeEventData,
  type TextInputEndEditingEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import { logError } from '@core/services/errorLogger';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
  clearLoginDiagnosticsFile,
  recordLoginDiagnostic,
  resetLoginDiagnostics,
} from '../loginDiagnostics';

function syncFieldFromNative(
  nativeText: string | undefined,
  current: string,
  apply: (value: string) => void,
): string {
  const next = (nativeText ?? '').trim().length > 0 ? nativeText ?? '' : current;
  if (next !== current) {
    apply(next);
  }
  return next;
}

export default function Login() {
  const { login, isLoggingIn, error, clearError, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginFormKey, setLoginFormKey] = useState(0);
  const emailInputRef = useRef<TextInputType>(null);
  const passwordInputRef = useRef<TextInputType>(null);
  const emailValueRef = useRef('');
  const passwordValueRef = useRef('');

  React.useEffect(() => {
    resetLoginDiagnostics();
    void clearLoginDiagnosticsFile();
  }, []);

  React.useEffect(() => {
    recordLoginDiagnostic({ type: 'auth_state', isAuthenticated, at: new Date().toISOString() });
    if (!isAuthenticated) {
      setLoginFormKey((k) => k + 1);
    }
  }, [isAuthenticated]);

  const applyEmail = useCallback((text: string) => {
    emailValueRef.current = text;
    setEmail(text);
    recordLoginDiagnostic({
      type: 'change',
      field: 'email',
      length: text.length,
      at: new Date().toISOString(),
    });
  }, []);

  const applyPassword = useCallback((text: string) => {
    passwordValueRef.current = text;
    setPassword(text);
    recordLoginDiagnostic({
      type: 'change',
      field: 'password',
      length: text.length,
      at: new Date().toISOString(),
    });
  }, []);

  const blurFieldsForSubmit = useCallback(async () => {
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    await new Promise((resolve) => setTimeout(resolve, 200));
  }, []);

  const onLogin = async () => {
    clearError();
    await blurFieldsForSubmit();

    const resolvedEmail = (emailValueRef.current || email).trim();
    const resolvedPassword = passwordValueRef.current || password;

    try {
      recordLoginDiagnostic({
        type: 'login_request',
        emailLength: resolvedEmail.length,
        passwordLength: resolvedPassword.length,
        at: new Date().toISOString(),
      });
      await login({ email: resolvedEmail, password: resolvedPassword });
      recordLoginDiagnostic({ type: 'login_result', ok: true, at: new Date().toISOString() });
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      recordLoginDiagnostic({
        type: 'login_result',
        ok: false,
        status,
        at: new Date().toISOString(),
      });
      void logError(e, 'LoginScreen.onLogin');
    }
  };

  const handleSignInPress = () => {
    recordLoginDiagnostic({
      type: 'submit',
      emailLength: (emailValueRef.current || email).trim().length,
      passwordLength: (passwordValueRef.current || password).length,
      at: new Date().toISOString(),
    });
    void onLogin();
  };

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
            ref={emailInputRef}
            testID="login-email-input"
            accessibilityLabel="Email or Username"
            placeholder="Email or Username"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            key={`login-email-${loginFormKey}`}
            value={email}
            onChangeText={applyEmail}
            onChange={(e: NativeSyntheticEvent<TextInputChangeEventData>) =>
              applyEmail(e.nativeEvent.text)
            }
            onFocus={() =>
              recordLoginDiagnostic({ type: 'focus', field: 'email', at: new Date().toISOString() })
            }
            onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
              syncFieldFromNative(e.nativeEvent.text, email, applyEmail);
            }}
            onBlur={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
              syncFieldFromNative(e.nativeEvent.text, email, applyEmail);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            editable={!isLoggingIn}
          />

          <TextInput
            ref={passwordInputRef}
            testID="login-password-input"
            accessibilityLabel="Password"
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
            key={`login-password-${loginFormKey}`}
            {...(Platform.OS === 'android'
              ? { defaultValue: '' }
              : { value: password })}
            onChangeText={applyPassword}
            onChange={(e: NativeSyntheticEvent<TextInputChangeEventData>) =>
              applyPassword(e.nativeEvent.text)
            }
            onFocus={() =>
              recordLoginDiagnostic({ type: 'focus', field: 'password', at: new Date().toISOString() })
            }
            onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
              syncFieldFromNative(e.nativeEvent.text, password, applyPassword);
            }}
            onBlur={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
              syncFieldFromNative(e.nativeEvent.text, password, applyPassword);
            }}
            autoCapitalize="none"
            textContentType="password"
            editable={!isLoggingIn}
            onSubmitEditing={handleSignInPress}
            returnKeyType="go"
          />

          <TouchableOpacity
            testID="login-submit-button"
            accessibilityLabel="Sign in"
            style={[styles.button, { backgroundColor: colors.primary }, isLoggingIn && styles.buttonDisabled]}
            onPress={handleSignInPress}
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
