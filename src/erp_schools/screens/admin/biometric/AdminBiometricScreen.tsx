/**
 * Biometric Management hub — web BiometricTab parity.
 * Tabs: Devices | Enrollments | Logs
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FilterChips,
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
  type ChipOption,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminBiometricData,
  type AdminBiometricTab,
  type BiometricDeviceRow,
  type BiometricEnrollmentRow,
  type BiometricLogRow,
} from '../../../hooks/useAdminBiometricData';
import {
  DEVICE_TYPES,
  DEVICE_STATUSES,
  ENROLL_STATUSES,
  PUNCH_TYPES,
  VERIFY_MODES,
  enumLabel,
  statusAccent,
  formatPunchTime,
  formatEnrolledDate,
} from '../../../utils/biometricMeta';

const BIOMETRIC_TABS: Array<{
  key: AdminBiometricTab;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'devices',
    title: 'Devices',
    subtitle: 'Register and maintain biometric hardware.',
  },
  {
    key: 'enrollments',
    title: 'Enrollments',
    subtitle: 'Link users to biometric templates.',
  },
  {
    key: 'logs',
    title: 'Logs',
    subtitle: 'View punch-in and punch-out records.',
  },
];

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
  danger,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
}) {
  const theme = useTeacherTheme();
  const border = danger ? theme.colors.danger : theme.colors.primary;
  const bg = outline
    ? theme.colors.surface
    : danger
      ? theme.colors.danger
      : theme.colors.primary;
  const fg = outline ? border : theme.colors.textInverse;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.compactBtn, { backgroundColor: bg, borderColor: border }]}
    >
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{label}</Text>
    </TouchableOpacity>
  );
}

function PageRow({
  page,
  pages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTeacherTheme();
  if (total <= 0) return null;
  return (
    <View style={styles.pageRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} / {pages} · {total} total
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} />
      <CompactBtn label="Next" outline onPress={onNext} />
    </View>
  );
}

export default function AdminBiometricScreen() {
  const theme = useTeacherTheme();
  const bio = useAdminBiometricData();
  const [tab, setTab] = useState<AdminBiometricTab>('devices');

  const [deviceModal, setDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDeviceRow | null>(null);
  const [deviceForm, setDeviceForm] = useState({
    deviceName: '',
    deviceType: 'fingerprint',
    serialNumber: '',
    ipAddress: '',
    location: '',
    firmwareVersion: '',
    status: 'active',
  });

  const [enrollModal, setEnrollModal] = useState(false);
  const [editingEnroll, setEditingEnroll] = useState<BiometricEnrollmentRow | null>(
    null,
  );
  const [enrollForm, setEnrollForm] = useState({
    userId: '',
    deviceId: '',
    biometricType: 'fingerprint',
    templateData: '',
    status: 'pending',
  });

  const [logModal, setLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<BiometricLogRow | null>(null);
  const [logForm, setLogForm] = useState({
    deviceId: '',
    userId: '',
    punchType: 'in',
    verificationMode: 'fingerprint',
    temperature: '',
    remarks: '',
  });

  const typeChips: ChipOption[] = useMemo(
    () => [
      { key: '', label: 'All Types' },
      ...DEVICE_TYPES.map((t) => ({ key: t, label: t })),
    ],
    [],
  );

  const enrollChips: ChipOption[] = useMemo(
    () => [
      { key: '', label: 'All Statuses' },
      ...ENROLL_STATUSES.map((s) => ({ key: s, label: s })),
    ],
    [],
  );

  const punchChips: ChipOption[] = useMemo(
    () => [
      { key: '', label: 'All Types' },
      ...PUNCH_TYPES.map((t) => ({ key: t, label: enumLabel(t) })),
    ],
    [],
  );

  const openDeviceCreate = () => {
    setEditingDevice(null);
    setDeviceForm({
      deviceName: '',
      deviceType: 'fingerprint',
      serialNumber: '',
      ipAddress: '',
      location: '',
      firmwareVersion: '',
      status: 'active',
    });
    setDeviceModal(true);
  };

  const openDeviceEdit = (item: BiometricDeviceRow) => {
    setEditingDevice(item);
    setDeviceForm({
      deviceName: item.deviceName,
      deviceType: item.deviceType || 'fingerprint',
      serialNumber: item.serialNumber,
      ipAddress: item.ipAddress,
      location: item.location,
      firmwareVersion: item.firmwareVersion,
      status: item.status || 'active',
    });
    setDeviceModal(true);
  };

  const openEnrollCreate = () => {
    setEditingEnroll(null);
    setEnrollForm({
      userId: '',
      deviceId: '',
      biometricType: 'fingerprint',
      templateData: '',
      status: 'pending',
    });
    setEnrollModal(true);
  };

  const openEnrollEdit = (item: BiometricEnrollmentRow) => {
    setEditingEnroll(item);
    setEnrollForm({
      userId: item.userId ? String(item.userId) : '',
      deviceId: item.deviceId ? String(item.deviceId) : '',
      biometricType: item.biometricType || 'fingerprint',
      templateData: item.templateData,
      status: item.status || 'pending',
    });
    setEnrollModal(true);
  };

  const openLogCreate = () => {
    setEditingLog(null);
    setLogForm({
      deviceId: '',
      userId: '',
      punchType: 'in',
      verificationMode: 'fingerprint',
      temperature: '',
      remarks: '',
    });
    setLogModal(true);
  };

  const openLogEdit = (item: BiometricLogRow) => {
    setEditingLog(item);
    setLogForm({
      deviceId: item.deviceId ? String(item.deviceId) : '',
      userId: item.userId ? String(item.userId) : '',
      punchType: item.punchType || 'in',
      verificationMode: item.verificationMode || 'fingerprint',
      temperature: item.temperature != null ? String(item.temperature) : '',
      remarks: item.remarks,
    });
    setLogModal(true);
  };

  const confirmDeactivate = (kind: string, onConfirm: () => void) => {
    Alert.alert('Deactivate?', `Deactivate this ${kind}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const confirmDelete = (onConfirm: () => void) => {
    Alert.alert('Delete?', 'Delete this log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  };

  if (bio.status === 'idle' || bio.status === 'loading') {
    return (
      <TeacherScreen contentStyle={styles.content}>
        <ScreenHeader title="Biometric" subtitle="Access Control" />
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 8 }}>
            Loading…
          </Text>
        </View>
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen contentStyle={styles.content}>
      <ScreenHeader
        title="Biometric"
        subtitle="Manage biometric devices, user enrollments, and attendance punch logs."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {BIOMETRIC_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.9}
              style={[
                styles.tabCard,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active
                      ? 'rgba(255,255,255,0.85)'
                      : theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {t.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {bio.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{bio.error}</Text>
      ) : null}

      {/* Devices */}
      {tab === 'devices' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={typeChips}
            activeKey={bio.typeFilter}
            onChange={(key) => bio.setDeviceTypeFilter(key)}
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {bio.deviceTotal} device{bio.deviceTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn
              label="Refresh"
              outline
              icon="refresh"
              onPress={() => void bio.loadDevices()}
            />
            {bio.canManage ? (
              <CompactBtn label="Add Device" icon="add" onPress={openDeviceCreate} />
            ) : null}
          </View>
          {bio.devices.length === 0 ? (
            <EmptyState
              icon="finger-print-outline"
              title="No devices"
              message="Register biometric hardware to get started."
            />
          ) : (
            bio.devices.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.deviceName || `Device #${item.id}`}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Serial {item.serialNumber || '—'}
                      {item.location ? ` · ${item.location}` : ''}
                    </Text>
                    <View style={styles.row}>
                      <Badge label={item.deviceType} accent="blue" />
                      <Badge
                        label={item.status}
                        accent={statusAccent(item.status)}
                      />
                      {!item.isActive ? <Badge label="inactive" accent="red" /> : null}
                    </View>
                  </View>
                  {bio.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn
                        label="Edit"
                        outline
                        onPress={() => openDeviceEdit(item)}
                      />
                      {item.isActive ? (
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('device', () => {
                              void bio.removeDevice(item.id);
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={bio.devicePage}
            pages={bio.devicePages}
            total={bio.deviceTotal}
            onPrev={() => bio.setDevicePage(Math.max(1, bio.devicePage - 1))}
            onNext={() =>
              bio.setDevicePage(Math.min(bio.devicePages, bio.devicePage + 1))
            }
          />
        </View>
      ) : null}

      {/* Enrollments */}
      {tab === 'enrollments' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={enrollChips}
            activeKey={bio.enrollStatusFilter}
            onChange={(key) => bio.setEnrollmentFilter(key)}
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {bio.enrollmentTotal} enrollment{bio.enrollmentTotal === 1 ? '' : 's'}
            </Text>
            {bio.canManage ? (
              <CompactBtn label="Enroll User" icon="add" onPress={openEnrollCreate} />
            ) : null}
          </View>
          {bio.enrollments.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No enrollments"
              message="Link users to biometric templates."
            />
          ) : (
            bio.enrollments.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      User #{item.userId}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Device #{item.deviceId || '—'} · Enrolled{' '}
                      {formatEnrolledDate(item.enrolledAt)}
                    </Text>
                    <View style={styles.row}>
                      <Badge
                        label={item.userType || item.biometricType || '—'}
                        accent="blue"
                      />
                      <Badge
                        label={item.status}
                        accent={statusAccent(item.status)}
                      />
                      {!item.isActive ? <Badge label="inactive" accent="red" /> : null}
                    </View>
                  </View>
                  {bio.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn
                        label="Edit"
                        outline
                        onPress={() => openEnrollEdit(item)}
                      />
                      {item.isActive ? (
                        <CompactBtn
                          label="Deactivate"
                          outline
                          danger
                          onPress={() =>
                            confirmDeactivate('enrollment', () => {
                              void bio.removeEnrollment(item.id);
                            })
                          }
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={bio.enrollmentPage}
            pages={bio.enrollmentPages}
            total={bio.enrollmentTotal}
            onPrev={() =>
              bio.setEnrollmentPage(Math.max(1, bio.enrollmentPage - 1))
            }
            onNext={() =>
              bio.setEnrollmentPage(
                Math.min(bio.enrollmentPages, bio.enrollmentPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Logs */}
      {tab === 'logs' ? (
        <View style={styles.section}>
          <FilterChips
            size="sm"
            options={punchChips}
            activeKey={bio.punchFilter}
            onChange={(key) => bio.setLogPunchFilter(key)}
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {bio.logTotal} log{bio.logTotal === 1 ? '' : 's'}
            </Text>
            {bio.canManage ? (
              <CompactBtn label="Log Punch" icon="add" onPress={openLogCreate} />
            ) : null}
          </View>
          {bio.logs.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="No logs"
              message="Punch-in and punch-out records will appear here."
            />
          ) : (
            bio.logs.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      User #{item.userId}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · Device #{item.deviceId || '—'} ·{' '}
                      {formatPunchTime(item.punchTime)}
                    </Text>
                    <View style={styles.row}>
                      <Badge
                        label={enumLabel(item.punchType)}
                        accent={statusAccent(item.punchType)}
                      />
                      <Badge label={item.verificationMode || '—'} accent="blue" />
                    </View>
                  </View>
                  {bio.canManage ? (
                    <View style={{ gap: 6 }}>
                      <CompactBtn
                        label="Edit"
                        outline
                        onPress={() => openLogEdit(item)}
                      />
                      <CompactBtn
                        label="Delete"
                        outline
                        danger
                        onPress={() =>
                          confirmDelete(() => {
                            void bio.removeLog(item.id);
                          })
                        }
                      />
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PageRow
            page={bio.logPage}
            pages={bio.logPages}
            total={bio.logTotal}
            onPrev={() => bio.setLogPage(Math.max(1, bio.logPage - 1))}
            onNext={() => bio.setLogPage(Math.min(bio.logPages, bio.logPage + 1))}
          />
        </View>
      ) : null}

      {/* Add / Edit Device modal */}
      <Modal
        visible={deviceModal}
        animationType="slide"
        onRequestClose={() => setDeviceModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingDevice ? 'Edit Device' : 'Add Device'}
            </Text>
            <TouchableOpacity onPress={() => setDeviceModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Device Name" required>
              <TextField
                value={deviceForm.deviceName}
                onChangeText={(v) => setDeviceForm((f) => ({ ...f, deviceName: v }))}
              />
            </FormField>
            <FormField label="Type">
              <SelectField
                options={DEVICE_TYPES.map((t) => ({ label: t, value: t }))}
                value={deviceForm.deviceType}
                onChange={(v) => setDeviceForm((f) => ({ ...f, deviceType: v }))}
              />
            </FormField>
            <FormField label="Serial Number" required>
              <TextField
                value={deviceForm.serialNumber}
                onChangeText={(v) =>
                  setDeviceForm((f) => ({ ...f, serialNumber: v }))
                }
              />
            </FormField>
            <FormField label="IP Address">
              <TextField
                value={deviceForm.ipAddress}
                onChangeText={(v) => setDeviceForm((f) => ({ ...f, ipAddress: v }))}
              />
            </FormField>
            <FormField label="Location">
              <TextField
                value={deviceForm.location}
                onChangeText={(v) => setDeviceForm((f) => ({ ...f, location: v }))}
              />
            </FormField>
            <FormField label="Firmware Version">
              <TextField
                value={deviceForm.firmwareVersion}
                onChangeText={(v) =>
                  setDeviceForm((f) => ({ ...f, firmwareVersion: v }))
                }
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={DEVICE_STATUSES.map((s) => ({ label: s, value: s }))}
                value={deviceForm.status}
                onChange={(v) => setDeviceForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <PrimaryButton
              label={bio.busy ? 'Saving…' : 'Save'}
              disabled={bio.busy}
              onPress={() => {
                if (!deviceForm.deviceName.trim() || !deviceForm.serialNumber.trim()) {
                  Alert.alert('Required', 'Name & serial required');
                  return;
                }
                void (async () => {
                  const ok = await bio.saveDevice(
                    {
                      deviceName: deviceForm.deviceName,
                      deviceType: deviceForm.deviceType,
                      serialNumber: deviceForm.serialNumber,
                      ipAddress: deviceForm.ipAddress,
                      location: deviceForm.location,
                      firmwareVersion: deviceForm.firmwareVersion,
                      status: deviceForm.status,
                    },
                    editingDevice?.id,
                  );
                  if (ok) setDeviceModal(false);
                  else Alert.alert('Save failed', bio.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setDeviceModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Enroll User modal */}
      <Modal
        visible={enrollModal}
        animationType="slide"
        onRequestClose={() => setEnrollModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingEnroll ? 'Edit Enrollment' : 'Enroll User'}
            </Text>
            <TouchableOpacity onPress={() => setEnrollModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="User ID" required>
              <TextField
                value={enrollForm.userId}
                onChangeText={(v) => setEnrollForm((f) => ({ ...f, userId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Device ID" required>
              <TextField
                value={enrollForm.deviceId}
                onChangeText={(v) => setEnrollForm((f) => ({ ...f, deviceId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Biometric Type">
              <SelectField
                options={DEVICE_TYPES.map((t) => ({ label: t, value: t }))}
                value={enrollForm.biometricType}
                onChange={(v) =>
                  setEnrollForm((f) => ({ ...f, biometricType: v }))
                }
              />
            </FormField>
            <FormField label="Template Data">
              <TextField
                value={enrollForm.templateData}
                onChangeText={(v) =>
                  setEnrollForm((f) => ({ ...f, templateData: v }))
                }
                placeholder="Biometric template ref"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                options={ENROLL_STATUSES.map((s) => ({ label: s, value: s }))}
                value={enrollForm.status}
                onChange={(v) => setEnrollForm((f) => ({ ...f, status: v }))}
              />
            </FormField>
            <PrimaryButton
              label={bio.busy ? 'Saving…' : 'Save'}
              disabled={bio.busy}
              onPress={() => {
                if (!enrollForm.userId || !enrollForm.deviceId) {
                  Alert.alert('Required', 'User & Device IDs required');
                  return;
                }
                void (async () => {
                  const ok = await bio.saveEnrollment(
                    {
                      userId: enrollForm.userId,
                      deviceId: enrollForm.deviceId,
                      biometricType: enrollForm.biometricType,
                      templateData: enrollForm.templateData,
                      status: enrollForm.status,
                    },
                    editingEnroll?.id,
                  );
                  if (ok) setEnrollModal(false);
                  else Alert.alert('Save failed', bio.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setEnrollModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Log Punch modal */}
      <Modal
        visible={logModal}
        animationType="slide"
        onRequestClose={() => setLogModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingLog ? 'Edit Log' : 'Log Punch'}
            </Text>
            <TouchableOpacity onPress={() => setLogModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Device ID" required>
              <TextField
                value={logForm.deviceId}
                onChangeText={(v) => setLogForm((f) => ({ ...f, deviceId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="User ID" required>
              <TextField
                value={logForm.userId}
                onChangeText={(v) => setLogForm((f) => ({ ...f, userId: v }))}
                keyboardType="numeric"
              />
            </FormField>
            <FormField label="Punch Type">
              <SelectField
                options={PUNCH_TYPES.map((t) => ({
                  label: enumLabel(t),
                  value: t,
                }))}
                value={logForm.punchType}
                onChange={(v) => setLogForm((f) => ({ ...f, punchType: v }))}
              />
            </FormField>
            <FormField label="Verification Mode">
              <SelectField
                options={VERIFY_MODES.map((m) => ({ label: m, value: m }))}
                value={logForm.verificationMode}
                onChange={(v) =>
                  setLogForm((f) => ({ ...f, verificationMode: v }))
                }
              />
            </FormField>
            <FormField label="Temperature">
              <TextField
                value={logForm.temperature}
                onChangeText={(v) => setLogForm((f) => ({ ...f, temperature: v }))}
                keyboardType="decimal-pad"
              />
            </FormField>
            <FormField label="Remarks">
              <TextField
                value={logForm.remarks}
                onChangeText={(v) => setLogForm((f) => ({ ...f, remarks: v }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={bio.busy ? 'Saving…' : 'Save'}
              disabled={bio.busy}
              onPress={() => {
                if (!logForm.deviceId || !logForm.userId) {
                  Alert.alert('Required', 'Device & User IDs required');
                  return;
                }
                void (async () => {
                  const ok = await bio.saveLog(
                    {
                      deviceId: logForm.deviceId,
                      userId: logForm.userId,
                      punchType: logForm.punchType,
                      verificationMode: logForm.verificationMode,
                      temperature: logForm.temperature,
                      remarks: logForm.remarks,
                    },
                    editingLog?.id,
                  );
                  if (ok) setLogModal(false);
                  else Alert.alert('Save failed', bio.error || 'Could not save');
                })();
              }}
            />
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => setLogModal(false)}
            />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
  loader: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  tabRail: { gap: 10, paddingRight: 8, paddingVertical: 2 },
  tabCard: {
    width: 168,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabSub: { fontSize: 11, lineHeight: 15, marginTop: 4 },
  section: { gap: 12 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  listRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowName: { fontSize: 15, fontWeight: '700' },
  compactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
});
