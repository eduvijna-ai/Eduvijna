/**
 * Shared ERP UI components
 * Reusable across all ERP module screens.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ─── Attendance-aligned design tokens ────────────────────────
export const BRAND = {
  primary: '#1B4F5C',
  primaryDark: '#154048',
  primaryLight: '#2B5F6C',
  tint: '#EAF4F6',
};

export const COLORS = {
  primary: BRAND.primary,
  primaryDark: BRAND.primaryDark,
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#ea580c',
  info: '#0284c7',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
};

export const ERP_TYPO = {
  title: 20,
  section: 14,
  body: 13,
  caption: 11,
};

// ─── Sub-tab bar ─────────────────────────────────────────────

interface SubTabBarProps {
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onTabChange: (key: string) => void;
}

export const SubTabBar: React.FC<SubTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.subTabScroll}
      contentContainerStyle={styles.subTabContent}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.subTab, active && styles.subTabActive]}
            onPress={() => onTabChange(tab.key)}
          >
            <Text style={[styles.subTabText, active && styles.subTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// ─── Search bar ───────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search…',
}) => (
  <View style={styles.searchWrap}>
    <Ionicons name="search-outline" size={18} color={COLORS.gray[500]} />
    <TextInput
      style={styles.searchInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.gray[400]}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')}>
        <Ionicons name="close-circle" size={18} color={COLORS.gray[400]} />
      </TouchableOpacity>
    )}
  </View>
);

// ─── KPI card ─────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  color = COLORS.primary,
  icon,
}) => (
  <View style={[styles.kpiCard, { borderLeftColor: color }]}>
    {icon && (
      <Ionicons
        name={icon as any}
        size={22}
        color={color}
        style={{ marginBottom: 4 }}
      />
    )}
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

// ─── Section header (with optional Add button) ────────────────

interface SectionHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  onAdd,
  addLabel = 'Add',
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {onAdd && (
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={16} color={COLORS.white} />
        <Text style={styles.addBtnText}>{addLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── List row ─────────────────────────────────────────────────

interface ListRowProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  rightComponent?: React.ReactNode;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  badge,
  badgeColor = COLORS.primary,
  onPress,
  onEdit,
  onDelete,
  rightComponent,
}) => (
  <TouchableOpacity
    style={styles.listRow}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.listRowContent}>
      <Text style={styles.listRowTitle} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.listRowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
    <View style={styles.listRowRight}>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: badgeColor + '20' }]}>
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
        </View>
      ) : null}
      {rightComponent}
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.iconBtn}>
          <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      {onDelete && (
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Delete', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: onDelete },
            ])
          }
          style={styles.iconBtn}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        </TouchableOpacity>
      )}
    </View>
  </TouchableOpacity>
);

// ─── Pagination ───────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  perPage: number;
  onPrev: () => void;
  onNext: () => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  total,
  perPage,
  onPrev,
  onNext,
}) => {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;
  return (
    <View style={styles.pagination}>
      <TouchableOpacity
        onPress={onPrev}
        disabled={page <= 1}
        style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
      >
        <Ionicons name="chevron-back" size={16} color={page <= 1 ? COLORS.gray[300] : COLORS.primary} />
      </TouchableOpacity>
      <Text style={styles.pageText}>
        {page} / {totalPages} ({total} total)
      </Text>
      <TouchableOpacity
        onPress={onNext}
        disabled={page >= totalPages}
        style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
      >
        <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? COLORS.gray[300] : COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Loading / Empty states ───────────────────────────────────

export const LoadingState: React.FC = () => (
  <View style={styles.center}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

export const EmptyState: React.FC<{ message?: string }> = ({
  message = 'No records found.',
}) => (
  <View style={styles.center}>
    <Ionicons name="document-text-outline" size={48} color={COLORS.gray[300]} />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

// ─── Status badge ─────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: COLORS.success,
  inactive: COLORS.gray[400],
  pending: '#f59e0b',
  approved: COLORS.success,
  rejected: COLORS.danger,
  completed: COLORS.success,
  cancelled: COLORS.gray[400],
  overdue: COLORS.danger,
  paid: COLORS.success,
  partial: '#f59e0b',
  open: COLORS.primary,
  in_progress: '#f59e0b',
  resolved: COLORS.success,
  closed: COLORS.gray[400],
  draft: COLORS.gray[400],
  generated: COLORS.primary,
  issued: COLORS.primary,
  returned: COLORS.success,
  lost: COLORS.danger,
  available: COLORS.success,
  full: COLORS.warning,
  maintenance: '#f59e0b',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const color = STATUS_COLORS[status?.toLowerCase()] ?? COLORS.gray[400];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>
        {status?.replace(/_/g, ' ')}
      </Text>
    </View>
  );
};

// ─── Form field ───────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  children,
  error,
}) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>
      {label}
      {required && <Text style={{ color: COLORS.danger }}> *</Text>}
    </Text>
    {children}
    {error ? <Text style={styles.formError}>{error}</Text> : null}
  </View>
);

// ─── Text input styled ────────────────────────────────────────

interface StyledInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: any;
  editable?: boolean;
}

export const StyledInput: React.FC<StyledInputProps> = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines = 1,
  keyboardType = 'default',
  editable = true,
}) => (
  <TextInput
    style={[
      styles.styledInput,
      multiline && { height: 24 * numberOfLines, textAlignVertical: 'top' },
      !editable && { backgroundColor: COLORS.gray[100], color: COLORS.gray[500] },
    ]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={COLORS.gray[400]}
    multiline={multiline}
    numberOfLines={numberOfLines}
    keyboardType={keyboardType}
    editable={editable}
  />
);

// ─── Modal form wrapper ───────────────────────────────────────

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  visible,
  title,
  onClose,
  onSave,
  saving = false,
  children,
}) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalCard}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

// ─── Select picker (simple) ───────────────────────────────────

interface SelectOption {
  label: string;
  value: string | number;
}

interface SimpleSelectProps {
  options: SelectOption[];
  value: string | number | null;
  onChange: (v: string | number) => void;
  placeholder?: string;
}

export const SimpleSelect: React.FC<SimpleSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={styles.selectTrigger}
        onPress={() => setOpen(true)}
      >
        <Text
          style={[
            styles.selectText,
            !selected && { color: COLORS.gray[400] },
          ]}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.gray[500]} />
      </TouchableOpacity>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.selectModal}>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.selectOption,
                    opt.value === value && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      opt.value === value && { color: COLORS.primary, fontWeight: '600' },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Sub-tab
  subTabScroll: { backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.gray[200] },
  subTabContent: { paddingHorizontal: 8, paddingVertical: 5, gap: 6, flexDirection: 'row' },
  subTab: { minWidth: 88, height: 32, paddingHorizontal: 9, borderRadius: 9, backgroundColor: COLORS.gray[100], alignItems: 'center', justifyContent: 'center' },
  subTabActive: { backgroundColor: COLORS.primary },
  subTabText: { fontSize: 10.5, color: COLORS.gray[700], fontWeight: '600' },
  subTabTextActive: { color: COLORS.white },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginVertical: 6,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: ERP_TYPO.body, color: COLORS.gray[800], padding: 0 },

  // KPI
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 90,
  },
  kpiValue: { fontSize: 22, fontWeight: '700' },
  kpiLabel: { fontSize: 11, color: COLORS.gray[500], marginTop: 2 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginHorizontal: 6,
    marginBottom: 6,
  },
  sectionTitle: { fontSize: ERP_TYPO.section, fontWeight: '700', color: COLORS.gray[800] },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: COLORS.white, fontSize: ERP_TYPO.body, fontWeight: '700' },

  // List row
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
  listRowContent: { flex: 1, marginRight: 8 },
  listRowTitle: { fontSize: ERP_TYPO.body, fontWeight: '600', color: COLORS.gray[800] },
  listRowSub: { fontSize: ERP_TYPO.caption, color: COLORS.gray[500], marginTop: 2 },
  listRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 4 },

  // Badge
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { fontSize: ERP_TYPO.body, color: COLORS.gray[600] },

  // Center
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: ERP_TYPO.body, color: COLORS.gray[400], textAlign: 'center' },

  // Form field
  formField: { marginBottom: 14 },
  formLabel: { fontSize: ERP_TYPO.caption, fontWeight: '600', color: COLORS.gray[700], marginBottom: 6 },
  formError: { fontSize: 12, color: COLORS.danger, marginTop: 4 },

  // Styled input
  styledInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: ERP_TYPO.body,
    color: COLORS.gray[800],
    backgroundColor: COLORS.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray[800] },
  modalBody: { padding: 16 },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.gray[600], fontWeight: '600' },
  saveBtn: {
    flex: 2,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveBtnText: { color: COLORS.white, fontWeight: '700' },

  // Select
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: COLORS.white,
  },
  selectText: { fontSize: ERP_TYPO.body, color: COLORS.gray[800] },
  selectModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 400,
    padding: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectOptionActive: { backgroundColor: COLORS.primary + '15' },
  selectOptionText: { fontSize: 14, color: COLORS.gray[800] },
});
