import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '@context/ThemeContext';
import { cancelPendingOpenQuizRequest } from '@core/services/openQuizRequestGuard';
import { navigateToAppMainTab } from '@platforms/mobile/navigation/navigateToAppMainTab';

interface QuizLoadingScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    replace?: (screen: string, params?: any) => void;
    dispatch?: (action: unknown) => void;
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
    // Invalidate in-flight open-quiz validation before leaving.
    cancelPendingOpenQuizRequest();
    // Prefer the screen's navigation prop (works on web shell + stack).
    if (navigation?.dispatch) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Main', state: { routes: [{ name: 'Dashboard' }], index: 0 } }],
        }),
      );
      return;
    }
    if (navigation?.replace) {
      navigation.replace('Main', { screen: 'Dashboard' });
      return;
    }
    if (navigation?.navigate) {
      navigation.navigate('Main', { screen: 'Dashboard' });
      return;
    }
    navigateToAppMainTab('Dashboard');
  };

  useEffect(() => {
    return () => {
      // Leaving the loading screen by any means must invalidate pending validation.
      cancelPendingOpenQuizRequest();
    };
  }, []);

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
