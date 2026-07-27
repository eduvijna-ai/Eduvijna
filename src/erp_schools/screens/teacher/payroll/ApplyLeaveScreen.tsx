/**
 * Apply / Edit Leave — web HRTab Apply Leave form parity.
 * Fields: leave type, from/to, half day, reason. staff_id from session.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  InfoBanner,
  PrimaryButton,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherHrData } from '../../../hooks/useTeacherHrData';
import { toLocalDateStr } from '../../../utils/apiHelpers';
import type { TeacherStackParamList } from '../../../types/navigation';

type HalfDay = 'first' | 'second' | null;

export default function ApplyLeaveScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ApplyLeave'>>();
  const {
    leaveTypeOptions,
    leaveHistory,
    staffName,
    applyLeave,
    updateLeave,
    saving,
    status,
    refetch,
  } = useTeacherHrData();

  const editingId = route.params?.leaveId;
  const isEdit = editingId != null && editingId > 0;
  const existing = useMemo(
    () => (isEdit ? leaveHistory.find((r) => r.leaveId === editingId) : undefined),
    [isEdit, editingId, leaveHistory],
  );

  const [leaveType, setLeaveType] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [halfDay, setHalfDay] = useState<HalfDay>(null);
  const [applyDate] = useState(toLocalDateStr());

  useEffect(() => {
    if (status === 'idle') void refetch();
  }, [status, refetch]);

  useEffect(() => {
    if (existing) {
      setLeaveType(
        existing.leaveTypeId != null
          ? String(existing.leaveTypeId)
          : leaveTypeOptions[0]?.value ?? null,
      );
      setFromDate(existing.fromDate);
      setToDate(existing.toDate);
      setReason(existing.reason || '');
      setHalfDay(existing.halfDay || null);
    } else if (!leaveType && leaveTypeOptions[0]) {
      setLeaveType(leaveTypeOptions[0].value);
    }
  }, [existing, leaveTypeOptions, leaveType]);

  const onSubmit = async () => {
    if (!fromDate.trim() || !toDate.trim()) {
      Alert.alert('Required', 'Leave from and to dates are required.');
      return;
    }
    if (!leaveType) {
      Alert.alert('Required', 'Please select Available Leave type.');
      return;
    }
    const payload = {
      leaveTypeId: leaveType,
      fromDate: fromDate.trim(),
      toDate: toDate.trim(),
      reason: reason.trim(),
      halfDay,
    };
    const ok = isEdit
      ? await updateLeave(editingId!, payload)
      : await applyLeave(payload);
    if (ok) {
      navigation.goBack();
    } else {
      Alert.alert(
        isEdit ? 'Update failed' : 'Submit failed',
        'Could not save leave. Use YYYY-MM-DD dates and try again.',
      );
    }
  };

  if (status === 'idle' || status === 'loading') {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Leave' : 'Apply Leave'} />}>
        <ScreenLoader message="Loading leave form…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Leave' : 'Apply Leave'} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? 'Saving…' : 'Save'}
            icon="checkmark-outline"
            disabled={saving}
            onPress={() => void onSubmit()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Apply Date">
            <TextField value={applyDate} editable={false} placeholder="YYYY-MM-DD" />
          </FormField>

          <FormField label="Available Leave" required>
            <SelectField
              options={leaveTypeOptions}
              value={leaveType}
              onChange={setLeaveType}
              placeholder="Select"
            />
          </FormField>

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <FormField label="Leave From Date" required>
                <TextField
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="YYYY-MM-DD"
                />
              </FormField>
            </View>
            <View style={styles.dateCol}>
              <FormField label="Leave To Date" required>
                <TextField value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" />
              </FormField>
            </View>
          </View>

          {staffName ? (
            <FormField label="Staff">
              <TextField value={staffName} editable={false} />
            </FormField>
          ) : null}

          <Text style={[styles.halfLabel, { color: theme.colors.textSecondary }]}>
            Half Day Options
          </Text>
          <View style={styles.halfRow}>
            {(
              [
                { key: 'first' as const, label: 'First Half' },
                { key: 'second' as const, label: 'Second Half' },
              ] as const
            ).map((opt) => {
              const active = halfDay === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.halfChip,
                    {
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: active ? theme.colors.primary : theme.colors.background,
                    },
                  ]}
                  onPress={() => setHalfDay(active ? null : opt.key)}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : theme.colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {halfDay ? (
              <TouchableOpacity onPress={() => setHalfDay(null)} style={styles.clearBtn}>
                <Text style={{ color: theme.colors.danger, fontSize: 12, fontWeight: '600' }}>
                  Clear
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FormField label="Reason" hint="Optional. Brief reason for your leave.">
            <TextField
              value={reason}
              onChangeText={setReason}
              placeholder="Reason…"
              multiline
            />
          </FormField>
        </View>
      </SurfaceCard>
      <InfoBanner tone="tip" text="Leave requests are reviewed by school admin / HR." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingBottom: 24, paddingHorizontal: 16 },
  form: { gap: 14 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1 },
  halfLabel: { fontSize: 11, fontWeight: '600' },
  halfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  halfChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
