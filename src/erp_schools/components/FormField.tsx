/** FormField + TextField + SelectField — single-column form primitives. */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  type KeyboardTypeOptions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, required, children, hint }: FormFieldProps) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
        {required ? <Text style={{ color: theme.colors.danger }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

interface TextFieldProps {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  editable = true,
}: TextFieldProps) {
  const theme = useTeacherTheme();
  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.inputMultiline,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.input,
          color: theme.colors.textPrimary,
          opacity: editable ? 1 : 0.75,
        },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.colors.textSecondary}
      multiline={multiline}
      keyboardType={keyboardType}
      editable={editable}
    />
  );
}

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SelectField({ options, value, onChange, placeholder = 'Select…' }: SelectFieldProps) {
  const theme = useTeacherTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.selectTrigger, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.input }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selected?.label ?? placeholder}
      >
        <Text style={{ color: selected ? theme.colors.textPrimary : theme.colors.textSecondary, fontSize: 15 }}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.sheet }]}>
            <ScrollView>
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.option}
                    onPress={() => { onChange(option.value); setOpen(false); }}
                  >
                    <Text style={{ color: active ? theme.colors.primary : theme.colors.textPrimary, fontSize: 15, fontWeight: active ? '700' : '400' }}>
                      {option.label}
                    </Text>
                    {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 11 },
  input: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, minHeight: 48, fontSize: 15, textAlignVertical: 'center', paddingVertical: 12 },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { maxHeight: '60%', paddingVertical: 8 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
});
