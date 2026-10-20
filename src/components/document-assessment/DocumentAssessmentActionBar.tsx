/**
 * Compact wrapping action row for document workspace (Gallery / Add / Crop / Restore / Clear).
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type DocumentWorkspaceAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

type Colors = {
  primary: string;
  card: string;
  border: string;
  textSecondary: string;
};

type Props = {
  hint: string;
  selectionLabel: string;
  actions: DocumentWorkspaceAction[];
  colors: Colors;
};

export default function DocumentAssessmentActionBar({
  hint,
  selectionLabel,
  actions,
  colors,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text>
      <Text style={[styles.selection, { color: colors.textSecondary }]}>{selectionLabel}</Text>
      <View style={styles.actions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            testID={action.testID}
            style={[
              styles.btn,
              { borderColor: colors.primary, backgroundColor: colors.card },
              (action.disabled || action.loading) && styles.disabled,
            ]}
            onPress={action.onPress}
            disabled={action.disabled || action.loading}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel || action.label}
          >
            {action.loading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name={action.icon} size={14} color={colors.primary} />
            )}
            <Text style={[styles.btnText, { color: colors.primary }]} numberOfLines={1}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  hint: { fontSize: 12, lineHeight: 16 },
  selection: { fontSize: 12, fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
  },
  btnText: { fontWeight: '700', fontSize: 12 },
  disabled: { opacity: 0.45 },
});
