/**
 * Mobile Login Screen
 * Platform: React Native (iOS/Android)
 * Engineering diagnostics: loginDiagnostics.ts (__DEV__ only).
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInput as TextInputType,
  type TextInputChangeEventData,
  type TextInputEndEditingEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import { logError } from '@core/services/errorLogger';
import LoadingSpinner from '../../../components/LoadingSpinner';
import {
  clearLoginDiagnosticsFile,
  recordLoginDiagnostic,
  resetLoginDiagnostics,
} from '../loginDiagnostics';

const HEADER_TEAL = '#D6E8EC';
const NOTEBOOK_LINE = '#B7D0D6';
const MOTIF_STROKE = '#7FA8B2';
const FORM_LABEL = '#1B4F5C';

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

function LoginHeaderArtwork({ width, height }: { width: number; height: number }) {
  const lineGap = Math.max(18, Math.round(height / 5));
  const lines = [];
  for (let y = lineGap; y < height - 8; y += lineGap) {
    lines.push(
      <Line
        key={`nb-${y}`}
        x1={16}
        y1={y}
        x2={width - 16}
        y2={y}
        stroke={NOTEBOOK_LINE}
        strokeWidth={1}
        opacity={0.55}
      />,
    );
  }

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Rect x={0} y={0} width={width} height={height} fill={HEADER_TEAL} />
      {lines}
      {/* Left margin rule */}
      <Line
        x1={28}
        y1={10}
        x2={28}
        y2={height - 10}
        stroke="#E8A0A0"
        strokeWidth={1.25}
        opacity={0.45}
      />
      {/* Pencil motif — lower left */}
      <Path
        d={`M ${18} ${height - 28} L ${38} ${height - 48} L ${44} ${height - 42} L ${24} ${height - 22} Z`}
        fill="#C4A35A"
        opacity={0.55}
      />
      <Path
        d={`M ${38} ${height - 48} L ${46} ${height - 56} L ${52} ${height - 50} L ${44} ${height - 42} Z`}
        fill="#E8D5A3"
        opacity={0.7}
      />
      {/* Geometry motif — upper right compass arc */}
      <Circle
        cx={width - 36}
        cy={36}
        r={22}
        stroke={MOTIF_STROKE}
        strokeWidth={1.25}
        fill="none"
        opacity={0.45}
      />
      <Line
        x1={width - 36}
        y1={36}
        x2={width - 18}
        y2={22}
        stroke={MOTIF_STROKE}
        strokeWidth={1.25}
        opacity={0.5}
      />
      <Circle cx={width - 36} cy={36} r={2.5} fill={MOTIF_STROKE} opacity={0.55} />
      <Line
        x1={width - 58}
        y1={58}
        x2={width - 20}
        y2={58}
        stroke={MOTIF_STROKE}
        strokeWidth={1}
        opacity={0.35}
      />
      <Line
        x1={width - 58}
        y1={58}
        x2={width - 58}
        y2={20}
        stroke={MOTIF_STROKE}
        strokeWidth={1}
        opacity={0.35}
      />
    </Svg>
  );
}

export default function Login() {
  const { login, isLoggingIn, error, clearError, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginFormKey, setLoginFormKey] = useState(0);
  const emailInputRef = useRef<TextInputType>(null);
  const passwordInputRef = useRef<TextInputType>(null);
  const emailValueRef = useRef('');
  const passwordValueRef = useRef('');

  const compactHeader = fontScale > 1.15 || windowWidth < 360;
  const headerHeight = compactHeader ? 132 : 168;
  const logoSize = compactHeader ? 88 : 112;

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
    <SafeAreaView style={[styles.safe, { backgroundColor: '#FFFFFF' }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.header, { height: headerHeight }]}>
            <LoginHeaderArtwork width={windowWidth} height={headerHeight} />
            <Image
              source={require('../../../../assets/eduvijna_stacked_transparent.png')}
              style={[styles.headerLogo, { width: logoSize, height: logoSize }]}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="EduVijna"
            />
          </View>

          <View style={styles.formCard}>
            <Text style={[styles.heading, { color: colors.primary }]}>Sign in</Text>

            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            <Text style={styles.label}>Email or username</Text>
            <TextInput
              ref={emailInputRef}
              testID="login-email-input"
              accessibilityLabel="Email or Username"
              placeholder="Email or username"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
              ]}
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
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              autoComplete="username"
              editable={!isLoggingIn}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordInputRef}
              testID="login-password-input"
              accessibilityLabel="Password"
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
              ]}
              key={`login-password-${loginFormKey}`}
              {...(Platform.OS === 'android' ? { defaultValue: '' } : { value: password })}
              onChangeText={applyPassword}
              onChange={(e: NativeSyntheticEvent<TextInputChangeEventData>) =>
                applyPassword(e.nativeEvent.text)
              }
              onFocus={() =>
                recordLoginDiagnostic({
                  type: 'focus',
                  field: 'password',
                  at: new Date().toISOString(),
                })
              }
              onEndEditing={(e: NativeSyntheticEvent<TextInputEndEditingEventData>) => {
                syncFieldFromNative(e.nativeEvent.text, password, applyPassword);
              }}
              autoCapitalize="none"
              textContentType="password"
              autoComplete="password"
              editable={!isLoggingIn}
              onSubmitEditing={handleSignInPress}
              returnKeyType="go"
            />

            <TouchableOpacity
              testID="login-submit-button"
              accessibilityLabel="Sign in"
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isLoggingIn && styles.buttonDisabled,
              ]}
              onPress={handleSignInPress}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <LoadingSpinner size={24} />
              ) : (
                <Text style={styles.buttonText}>Sign in</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerLogo: {
    zIndex: 1,
  },
  formCard: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    width: '100%',
    fontSize: 13,
    fontWeight: '600',
    color: FORM_LABEL,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  error: {
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'left',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
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
