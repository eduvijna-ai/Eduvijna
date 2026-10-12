import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  colors: { primary: string; border: string; text: string; textSecondary: string; card: string };
  /** Disambiguates multiple pagers on one screen (e.g. quiz list vs summary). */
  scope?: 'class' | 'quiz' | 'summary' | 'attempt';
}

export default function AnalyticsPagination({
  page,
  totalPages,
  onPageChange,
  colors,
  scope = 'class',
}: Props) {
  const infoTestId = `analytics-${scope}-pagination-info`;
  const nextTestId = `analytics-${scope}-pagination-next`;
  if (totalPages <= 1) return null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.card }, page === 1 && styles.disabled]}
        onPress={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <Ionicons name="chevron-back" size={16} color={page === 1 ? colors.textSecondary : colors.primary} />
        <Text style={[styles.btnText, { color: page === 1 ? colors.textSecondary : colors.primary }]}>Previous</Text>
      </TouchableOpacity>
      <Text
        testID={infoTestId}
        accessibilityLabel={`Analytics ${scope} page ${page} of ${totalPages}`}
        style={[styles.info, { color: colors.textSecondary }]}
      >
        Page {page} of {totalPages}
      </Text>
      <TouchableOpacity
        testID={nextTestId}
        accessibilityRole="button"
        accessibilityLabel={`Next ${scope} page`}
        style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.card }, page === totalPages && styles.disabled]}
        onPress={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        <Text style={[styles.btnText, { color: page === totalPages ? colors.textSecondary : colors.primary }]}>Next</Text>
        <Ionicons name="chevron-forward" size={16} color={page === totalPages ? colors.textSecondary : colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnText: { fontSize: 12, fontWeight: '600' },
  info: { fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
