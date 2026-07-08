/**
 * Modal-based dropdown — avoids Android native Picker crashes when
 * TextInputs on the same screen trigger re-renders (see CreateAIQuizScreen).
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

export interface ModalDropdownItem {
  id: string;
  name?: string;
  label?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: ModalDropdownItem[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
}

function itemLabel(item: ModalDropdownItem): string {
  return item.name || item.label || String(item.id);
}

export default React.memo(function ModalDropdownField({
  label,
  value,
  onChange,
  items,
  placeholder = 'Select...',
  required = false,
  disabled = false,
  hideLabel = false,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (!value) return placeholder;
    const match = items.find((item) => String(item.id) === String(value));
    return match ? itemLabel(match) : placeholder;
  }, [value, items, placeholder]);

  return (
    <View style={styles.fieldBlock}>
      {!hideLabel ? (
        <Text style={styles.fieldLabel}>
          {label}
          {required ? ' *' : ''}
        </Text>
      ) : null}
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.disabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.triggerText, !value && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.option, !value && styles.optionSelected]}
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, !value && styles.optionTextSelected]}>{placeholder}</Text>
              </TouchableOpacity>
              {items.map((item) => {
                const id = String(item.id);
                const isSelected = String(value) === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => {
                      onChange(id);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {itemLabel(item)}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const createStyles = (colors: any) =>
  StyleSheet.create({
    fieldBlock: { marginBottom: 10 },
    fieldLabel: {
      marginBottom: 5,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    triggerText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      marginRight: 8,
    },
    placeholder: { color: colors.textSecondary },
    disabled: { opacity: 0.6 },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '70%',
      paddingBottom: 24,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    list: { maxHeight: 400 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionSelected: { backgroundColor: `${colors.primary}12` },
    optionText: { fontSize: 15, color: colors.text, flex: 1 },
    optionTextSelected: { color: colors.primary, fontWeight: '600' },
  });
