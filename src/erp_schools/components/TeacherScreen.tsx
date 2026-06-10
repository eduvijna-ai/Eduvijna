/**
 * TeacherScreen — the standard screen scaffold.
 *
 * Implements the DESIGN.md layout contract: Header slot · scrollable Content ·
 * optional sticky Footer (CTA), all inside a safe area. Every screen uses this
 * so spacing, background and safe-area handling stay consistent.
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface TeacherScreenProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function TeacherScreen({
  header,
  footer,
  children,
  scroll = true,
  contentStyle,
  refreshing,
  onRefresh,
}: TeacherScreenProps) {
  const theme = useTeacherTheme();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        { paddingBottom: theme.spacing.xl + insets.bottom },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh
          ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          )
          : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {header}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: theme.spacing.sm + insets.bottom,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
