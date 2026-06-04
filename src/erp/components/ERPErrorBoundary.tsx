/**
 * ERP Error Boundary
 * Catches render-time errors in ERP screens and shows a friendly fallback.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './common';

interface State {
  hasError: boolean;
  errorMessage: string;
}

interface Props {
  children: React.ReactNode;
}

export default class ERPErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ERP Error Boundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={56} color={COLORS.danger} />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry}>
            <Ionicons name="refresh-outline" size={18} color={COLORS.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
