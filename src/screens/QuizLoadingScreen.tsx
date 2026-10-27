import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@context/ThemeContext';

interface QuizLoadingScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    replace?: (screen: string, params?: any) => void;
    canGoBack?: () => boolean;
    goBack?: () => void;
  };
  route?: {
    params?: {
      message?: string;
    };
  };
}

const LOADING_WATCHDOG_MS = 45000;

export default function QuizLoadingScreen({ navigation, route }: QuizLoadingScreenProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const message = route?.params?.message || 'Loading quiz...';
  const leftRef = useRef(false);

  const leaveToHome = () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (navigation?.replace) {
      navigation.replace('Main', { screen: 'Dashboard' });
      return;
    }
    navigation?.navigate?.('Main', { screen: 'Dashboard' });
  };

  // Safety net: never leave the user stranded on "Validating quiz..." forever.
  useEffect(() => {
    leftRef.current = false;
    const timer = setTimeout(leaveToHome, LOADING_WATCHDOG_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.contentContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.message, { color: colors.text }]}>
          {message}
        </Text>
        <Text style={[styles.subMessage, { color: colors.textSecondary }]}>
          Please wait while we prepare your quiz
        </Text>
        <TouchableOpacity
          onPress={leaveToHome}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Cancel quiz validation"
        >
          <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  subMessage: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
