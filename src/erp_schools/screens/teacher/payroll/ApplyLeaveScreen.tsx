/** Apply Leave — leave request form (UI only). */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  InfoBanner,
  PrimaryButton,
} from '../../../components';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { leaveTypeOptions } from '../../../data';

export default function ApplyLeaveScreen() {
  const navigation = useTeacherNavigation();
  const [leaveType, setLeaveType] = useState<string | null>(leaveTypeOptions[0]?.value ?? null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const onSubmit = () => {
    if (!fromDate.trim() || !toDate.trim()) {
      Alert.alert('Missing dates', 'Please select the leave period.');
      return;
    }
    Alert.alert('Request submitted', 'Your leave request has been sent for approval (demo).', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <TeacherScreen
      header={<ScreenHeader title="Apply Leave" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Submit Request" icon="paper-plane-outline" onPress={onSubmit} />}
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Leave Type" required>
            <SelectField options={leaveTypeOptions} value={leaveType} onChange={setLeaveType} />
          </FormField>
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <FormField label="From" required>
                <TextField value={fromDate} onChangeText={setFromDate} placeholder="DD/MM/YYYY" />
              </FormField>
            </View>
            <View style={styles.dateCol}>
              <FormField label="To" required>
                <TextField value={toDate} onChangeText={setToDate} placeholder="DD/MM/YYYY" />
              </FormField>
            </View>
          </View>
          <FormField label="Reason" required hint="Provide a brief reason for your leave.">
            <TextField value={reason} onChangeText={setReason} placeholder="e.g. Family function" multiline />
          </FormField>
        </View>
      </SurfaceCard>
      <InfoBanner text="Requests are reviewed by the administrator. You'll be notified once a decision is made." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  form: { gap: 16 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1 },
});
