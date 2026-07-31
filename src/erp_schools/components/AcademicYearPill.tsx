/**
 * AcademicYearPill — the "Academic Year / 2024-25 ▾" selector pill shown on the
 * right of student identity headers. Opens a lightweight modal picker.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface AcademicYearPillProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function AcademicYearPill({ value, options, onChange }: AcademicYearPillProps) {
  const theme = useTeacherTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Academic Year ${value}`}
      >
        <View>
          <Text style={[styles.caption, { color: theme.colors.textSecondary }]}>Academic Year</Text>
          <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        </View>
        <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}>
            {options.map((option) => {
              const active = option === value;
              return (
                <TouchableOpacity
                  key={option}
                  style={styles.option}
                  onPress={() => { onChange(option); setOpen(false); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={{ color: active ? theme.colors.primary : theme.colors.textPrimary, fontSize: 15, fontWeight: active ? '700' : '400' }}>
                    {option}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  caption: { fontSize: 9, lineHeight: 11, fontWeight: '600' },
  value: { fontSize: 12, fontWeight: '800', lineHeight: 15 },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { paddingVertical: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
});
