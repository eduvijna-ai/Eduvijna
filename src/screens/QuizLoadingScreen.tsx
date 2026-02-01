import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@context/ThemeContext';

interface QuizLoadingScreenProps {
  route?: {
    params?: {
      message?: string;
    };
  };
}

export default function QuizLoadingScreen({ route }: QuizLoadingScreenProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const message = route?.params?.message || 'Loading quiz...';

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
});
