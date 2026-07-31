/**
 * Admin Parent Portal hub — web ParentPortalTab parity.
 * Tabs: PTM Schedules | Appointments | Communications
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  Badge,
  EmptyState,
  PrimaryButton,
  FormField,
  TextField,
  SelectField,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import {
  useAdminParentPortalData,
  studentLabel,
  staffLabel,
  type AdminParentPortalTab,
  type ScheduleRow,
  type AppointmentRow,
  type CommunicationRow,
} from '../../../hooks/useAdminParentPortalData';
import {
  MEETING_TYPES,
  PTM_STATUSES,
  APPT_STATUSES,
  COMM_TYPES,
  COMM_STATUSES,
  underscoreLabel,
  statusAccent,
} from '../../../utils/parentPortalMeta';

const PORTAL_TABS: Array<{
  key: AdminParentPortalTab;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'schedules',
    title: 'PTM Schedules',
    subtitle: 'Plan parent-teacher meeting sessions.',
  },
  {
    key: 'appointments',
    title: 'Appointments',
    subtitle: 'Book and track individual PTM slots.',
  },
  {
    key: 'communications',
    title: 'Communications',
    subtitle: 'Messages, queries, and feedback from parents.',
  },
];

function CompactBtn({
  label,
  onPress,
  outline,
  icon,
}: {
  label: string;
  onPress: () => void;
  outline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.compactBtn,
        {
          backgroundColor: outline ? theme.colors.surface : theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={16}
          color={outline ? theme.colors.primary : theme.colors.textInverse}
        />
      ) : null}
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: outline ? theme.colors.primary : theme.colors.textInverse,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PaginationRow({
  page,
  totalPages,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const theme = useTeacherTheme();
  if (totalPages <= 1) return null;
  return (
    <View style={styles.row}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>
        Page {page} of {totalPages} · {total} total
      </Text>
      <CompactBtn label="Prev" outline onPress={onPrev} icon="chevron-back" />
      <CompactBtn label="Next" outline onPress={onNext} icon="chevron-forward" />
    </View>
  );
}

export default function AdminParentPortalScreen() {
  const theme = useTeacherTheme();
  const pp = useAdminParentPortalData();
  const [tab, setTab] = useState<AdminParentPortalTab>('schedules');

  const [schedModal, setSchedModal] = useState(false);
  const [editingSched, setEditingSched] = useState<ScheduleRow | null>(null);
  const [schedForm, setSchedForm] = useState({
    title: '',
    meetingType: 'general',
    meetingDate: '',
    startTime: '',
    endTime: '',
    venue: '',
    status: 'scheduled',
    description: '',
  });

  const [apptModal, setApptModal] = useState(false);
  const [editingAppt, setEditingAppt] = useState<AppointmentRow | null>(null);
  const [apptForm, setApptForm] = useState({
    scheduleId: '',
    studentId: '',
    parentId: '',
    teacherId: '',
    slotTime: '',
    status: 'booked',
    parentRemarks: '',
    teacherRemarks: '',
  });

  const [commModal, setCommModal] = useState(false);
  const [editingComm, setEditingComm] = useState<CommunicationRow | null>(null);
  const [commForm, setCommForm] = useState({
    studentId: '',
    parentId: '',
    commType: 'message',
    subject: '',
    message: '',
    reply: '',
    status: 'sent',
  });

  const meetingTypeOpts = useMemo(
    () => [
      { label: 'All Types', value: '' },
      ...MEETING_TYPES.map((t) => ({ label: underscoreLabel(t), value: t })),
    ],
    [],
  );

  const meetingTypeFormOpts = useMemo(
    () => MEETING_TYPES.map((t) => ({ label: t, value: t })),
    [],
  );

  const ptmStatusOpts = useMemo(
    () => PTM_STATUSES.map((s) => ({ label: s, value: s })),
    [],
  );

  const apptStatusFilterOpts = useMemo(
    () => [
      { label: 'All Statuses', value: '' },
      ...APPT_STATUSES.map((s) => ({ label: underscoreLabel(s), value: s })),
    ],
    [],
  );

  const apptStatusFormOpts = useMemo(
    () => APPT_STATUSES.map((s) => ({ label: underscoreLabel(s), value: s })),
    [],
  );

  const commTypeFilterOpts = useMemo(
    () => [
      { label: 'All Types', value: '' },
      ...COMM_TYPES.map((t) => ({ label: underscoreLabel(t), value: t })),
    ],
    [],
  );

  const commTypeFormOpts = useMemo(
    () => COMM_TYPES.map((t) => ({ label: underscoreLabel(t), value: t })),
    [],
  );

  const commStatusFilterOpts = useMemo(
    () => [
      { label: 'All Statuses', value: '' },
      ...COMM_STATUSES.map((s) => ({ label: s, value: s })),
    ],
    [],
  );

  const scheduleOpts = useMemo(
    () => [
      { label: 'Select schedule…', value: '' },
      ...pp.scheduleCatalog.map((s) => ({
        label: `${s.title}${s.meetingDate ? ` — ${s.meetingDate}` : ''}`,
        value: String(s.id),
      })),
    ],
    [pp.scheduleCatalog],
  );

  const studentOpts = useMemo(
    () => [
      { label: 'Select student…', value: '' },
      ...pp.students.map((s) => ({
        label: studentLabel(s),
        value: String(s.userId),
      })),
    ],
    [pp.students],
  );

  const teacherOpts = useMemo(
    () => [
      { label: 'Select teacher…', value: '' },
      ...pp.staff.map((s) => ({
        label: staffLabel(s),
        value: String(s.userId || s.id),
      })),
    ],
    [pp.staff],
  );

  const guardianOpts = useMemo(
    () => [
      {
        label: apptForm.studentId || commForm.studentId
          ? 'Select parent…'
          : 'Select a student first',
        value: '',
      },
      ...pp.guardians.map((g) => ({
        label: `${g.name}${g.relation ? ` (${g.relation})` : ''}`,
        value: String(g.id),
      })),
    ],
    [pp.guardians, apptForm.studentId, commForm.studentId],
  );

  useEffect(() => {
    if (apptModal) void pp.loadGuardiansForStudent(apptForm.studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apptModal, apptForm.studentId]);

  useEffect(() => {
    if (commModal) void pp.loadGuardiansForStudent(commForm.studentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commModal, commForm.studentId]);

  const openSchedCreate = () => {
    setEditingSched(null);
    setSchedForm({
      title: '',
      meetingType: 'general',
      meetingDate: '',
      startTime: '',
      endTime: '',
      venue: '',
      status: 'scheduled',
      description: '',
    });
    setSchedModal(true);
  };

  const openApptCreate = () => {
    setEditingAppt(null);
    pp.clearGuardians();
    setApptForm({
      scheduleId: '',
      studentId: '',
      parentId: '',
      teacherId: '',
      slotTime: '',
      status: 'booked',
      parentRemarks: '',
      teacherRemarks: '',
    });
    setApptModal(true);
  };

  const openCommCreate = () => {
    setEditingComm(null);
    pp.clearGuardians();
    setCommForm({
      studentId: '',
      parentId: '',
      commType: 'message',
      subject: '',
      message: '',
      reply: '',
      status: 'sent',
    });
    setCommModal(true);
  };

  const confirmDeactivate = (label: string, onConfirm: () => void) => {
    Alert.alert('Deactivate?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: onConfirm },
    ]);
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Parent Portal"
          subtitle="Family Engagement"
          trailingIcon="refresh-outline"
          onTrailingPress={() => void pp.refetch()}
        />
      }
      contentStyle={styles.content}
    >
      {pp.status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} />
      ) : null}
      {pp.error ? (
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{pp.error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRail}
      >
        {PORTAL_TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.88}
              style={[
                styles.tabCard,
                theme.shadow.light,
                {
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabTitle,
                  { color: active ? theme.colors.textInverse : theme.colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {t.title}
              </Text>
              <Text
                style={[
                  styles.tabSub,
                  {
                    color: active ? 'rgba(255,255,255,0.82)' : theme.colors.textSecondary,
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

      {/* PTM Schedules */}
      {tab === 'schedules' ? (
        <View style={styles.section}>
          <SelectField
            value={pp.meetingTypeFilter}
            onChange={pp.setMeetingType}
            options={meetingTypeOpts}
            placeholder="All Types"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {pp.scheduleTotal} schedule{pp.scheduleTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Schedule PTM" icon="add" onPress={openSchedCreate} />
          </View>
          {pp.schedules.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No schedules"
              message="Schedule a parent-teacher meeting session."
            />
          ) : (
            pp.schedules.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · {item.meetingDate || '—'}
                      {item.startTime ? ` · ${item.startTime}` : ''}
                      {item.venue ? ` · ${item.venue}` : ''}
                    </Text>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <Badge label={underscoreLabel(item.meetingType)} accent="purple" />
                    <Badge label={item.status} accent={statusAccent(item.status)} />
                  </View>
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingSched(item);
                      setSchedForm({
                        title: item.title,
                        meetingType: item.meetingType || 'general',
                        meetingDate: item.meetingDate,
                        startTime: item.startTime,
                        endTime: item.endTime,
                        venue: item.venue,
                        status: item.status || 'scheduled',
                        description: item.description,
                      });
                      setSchedModal(true);
                    }}
                  />
                  {item.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(item.title, () =>
                          void pp.removeSchedule(item.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={pp.schedulePage}
            totalPages={pp.schedulePages}
            total={pp.scheduleTotal}
            onPrev={() => pp.setSchedulePage(Math.max(1, pp.schedulePage - 1))}
            onNext={() =>
              pp.setSchedulePage(Math.min(pp.schedulePages, pp.schedulePage + 1))
            }
          />
        </View>
      ) : null}

      {/* Appointments */}
      {tab === 'appointments' ? (
        <View style={styles.section}>
          <SelectField
            value={pp.apptStatusFilter}
            onChange={pp.setApptStatus}
            options={apptStatusFilterOpts}
            placeholder="All Statuses"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {pp.appointmentTotal} appointment{pp.appointmentTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="Add Appointment" icon="add" onPress={openApptCreate} />
          </View>
          {pp.appointments.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No appointments"
              message="Book a PTM slot for a parent and teacher."
            />
          ) : (
            pp.appointments.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {pp.scheduleLabel(item.scheduleId)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id}
                      {item.slotTime ? ` · ${item.slotTime}` : ''}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Parent {pp.parentName(item.parentId)} · Teacher{' '}
                      {pp.staffName(item.teacherId)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Student {pp.studentName(item.studentId)}
                    </Text>
                  </View>
                  <Badge
                    label={underscoreLabel(item.status)}
                    accent={statusAccent(item.status)}
                  />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingAppt(item);
                      setApptForm({
                        scheduleId: String(item.scheduleId),
                        studentId: String(item.studentId),
                        parentId: String(item.parentId),
                        teacherId: String(item.teacherId),
                        slotTime: item.slotTime,
                        status: item.status || 'booked',
                        parentRemarks: item.parentRemarks,
                        teacherRemarks: item.teacherRemarks,
                      });
                      setApptModal(true);
                    }}
                  />
                  {item.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(`Appointment #${item.id}`, () =>
                          void pp.removeAppointment(item.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={pp.appointmentPage}
            totalPages={pp.appointmentPages}
            total={pp.appointmentTotal}
            onPrev={() =>
              pp.setAppointmentPage(Math.max(1, pp.appointmentPage - 1))
            }
            onNext={() =>
              pp.setAppointmentPage(
                Math.min(pp.appointmentPages, pp.appointmentPage + 1),
              )
            }
          />
        </View>
      ) : null}

      {/* Communications */}
      {tab === 'communications' ? (
        <View style={styles.section}>
          <SelectField
            value={pp.commTypeFilter}
            onChange={pp.setCommType}
            options={commTypeFilterOpts}
            placeholder="All Types"
          />
          <SelectField
            value={pp.commStatusFilter}
            onChange={pp.setCommStatus}
            options={commStatusFilterOpts}
            placeholder="All Statuses"
          />
          <View style={styles.row}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {pp.commTotal} message{pp.commTotal === 1 ? '' : 's'}
            </Text>
            <CompactBtn label="New Message" icon="add" onPress={openCommCreate} />
          </View>
          {pp.communications.length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="No communications"
              message="Send a message, query, or feedback to a parent."
            />
          ) : (
            pp.communications.map((item) => (
              <SurfaceCard key={item.id}>
                <View style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: theme.colors.textPrimary }]}>
                      {item.subject}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      ID {item.id} · {underscoreLabel(item.commType)}
                    </Text>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      Parent {pp.parentName(item.parentId)} · Student{' '}
                      {pp.studentName(item.studentId)}
                    </Text>
                  </View>
                  <Badge label={item.status} accent={statusAccent(item.status)} />
                </View>
                <View style={styles.row}>
                  <CompactBtn
                    label="Edit"
                    outline
                    onPress={() => {
                      setEditingComm(item);
                      setCommForm({
                        studentId: String(item.studentId),
                        parentId: String(item.parentId),
                        commType: item.commType || 'message',
                        subject: item.subject,
                        message: item.message,
                        reply: item.reply,
                        status: item.status || 'sent',
                      });
                      setCommModal(true);
                    }}
                  />
                  {item.isActive ? (
                    <CompactBtn
                      label="Deactivate"
                      outline
                      onPress={() =>
                        confirmDeactivate(item.subject || `Message #${item.id}`, () =>
                          void pp.removeCommunication(item.id),
                        )
                      }
                    />
                  ) : null}
                </View>
              </SurfaceCard>
            ))
          )}
          <PaginationRow
            page={pp.commPage}
            totalPages={pp.commPages}
            total={pp.commTotal}
            onPrev={() => pp.setCommPage(Math.max(1, pp.commPage - 1))}
            onNext={() =>
              pp.setCommPage(Math.min(pp.commPages, pp.commPage + 1))
            }
          />
        </View>
      ) : null}

      {/* Schedule PTM modal */}
      <Modal
        visible={schedModal}
        animationType="slide"
        onRequestClose={() => setSchedModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingSched ? 'Edit Schedule' : 'Schedule PTM'}
            </Text>
            <TouchableOpacity onPress={() => setSchedModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Title" required>
              <TextField
                value={schedForm.title}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, title: t }))}
              />
            </FormField>
            <FormField label="Meeting Type">
              <SelectField
                value={schedForm.meetingType}
                onChange={(v) => setSchedForm((f) => ({ ...f, meetingType: v }))}
                options={meetingTypeFormOpts}
              />
            </FormField>
            <FormField label="Date" required>
              <TextField
                value={schedForm.meetingDate}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, meetingDate: t }))}
                placeholder="YYYY-MM-DD"
              />
            </FormField>
            <FormField label="Start Time">
              <TextField
                value={schedForm.startTime}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, startTime: t }))}
                placeholder="HH:MM"
              />
            </FormField>
            <FormField label="End Time">
              <TextField
                value={schedForm.endTime}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, endTime: t }))}
                placeholder="HH:MM"
              />
            </FormField>
            <FormField label="Venue">
              <TextField
                value={schedForm.venue}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, venue: t }))}
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={schedForm.status}
                onChange={(v) => setSchedForm((f) => ({ ...f, status: v }))}
                options={ptmStatusOpts}
              />
            </FormField>
            <FormField label="Description">
              <TextField
                value={schedForm.description}
                onChangeText={(t) => setSchedForm((f) => ({ ...f, description: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={pp.busy ? 'Saving…' : 'Save'}
              disabled={pp.busy}
              onPress={() => {
                void (async () => {
                  const ok = await pp.saveSchedule(
                    {
                      title: schedForm.title,
                      meetingType: schedForm.meetingType,
                      meetingDate: schedForm.meetingDate,
                      startTime: schedForm.startTime,
                      endTime: schedForm.endTime,
                      venue: schedForm.venue,
                      status: schedForm.status,
                      description: schedForm.description,
                    },
                    editingSched?.id,
                  );
                  if (ok) setSchedModal(false);
                  else Alert.alert('Save failed', pp.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Add Appointment modal */}
      <Modal
        visible={apptModal}
        animationType="slide"
        onRequestClose={() => setApptModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingAppt ? 'Edit Appointment' : 'Add Appointment'}
            </Text>
            <TouchableOpacity onPress={() => setApptModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Meeting Schedule" required>
              <SelectField
                value={apptForm.scheduleId}
                onChange={(v) => setApptForm((f) => ({ ...f, scheduleId: v }))}
                options={scheduleOpts}
                placeholder="Select schedule…"
              />
            </FormField>
            <FormField label="Student" required>
              <SelectField
                value={apptForm.studentId}
                onChange={(v) =>
                  setApptForm((f) => ({ ...f, studentId: v, parentId: '' }))
                }
                options={studentOpts}
                placeholder="Select student…"
              />
            </FormField>
            {!pp.academicYearId ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                Select an academic year to load students.
              </Text>
            ) : null}
            <FormField label="Parent / Guardian" required>
              <SelectField
                value={apptForm.parentId}
                onChange={(v) => setApptForm((f) => ({ ...f, parentId: v }))}
                options={guardianOpts}
                placeholder={
                  apptForm.studentId ? 'Select parent…' : 'Select a student first'
                }
                disabled={!apptForm.studentId}
              />
            </FormField>
            {apptForm.studentId && pp.guardians.length === 0 ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                No guardian on file for this student. Add one under Students → Guardians.
              </Text>
            ) : null}
            <FormField label="Teacher" required>
              <SelectField
                value={apptForm.teacherId}
                onChange={(v) => setApptForm((f) => ({ ...f, teacherId: v }))}
                options={teacherOpts}
                placeholder="Select teacher…"
              />
            </FormField>
            <FormField label="Slot Time">
              <TextField
                value={apptForm.slotTime}
                onChangeText={(t) => setApptForm((f) => ({ ...f, slotTime: t }))}
                placeholder="HH:MM"
              />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={apptForm.status}
                onChange={(v) => setApptForm((f) => ({ ...f, status: v }))}
                options={apptStatusFormOpts}
              />
            </FormField>
            <FormField label="Parent Remarks">
              <TextField
                value={apptForm.parentRemarks}
                onChangeText={(t) => setApptForm((f) => ({ ...f, parentRemarks: t }))}
                multiline
              />
            </FormField>
            <FormField label="Teacher Remarks">
              <TextField
                value={apptForm.teacherRemarks}
                onChangeText={(t) => setApptForm((f) => ({ ...f, teacherRemarks: t }))}
                multiline
              />
            </FormField>
            <PrimaryButton
              label={pp.busy ? 'Saving…' : 'Save'}
              disabled={pp.busy}
              onPress={() => {
                void (async () => {
                  const ok = await pp.saveAppointment(
                    {
                      scheduleId: apptForm.scheduleId,
                      studentId: apptForm.studentId,
                      parentId: apptForm.parentId,
                      teacherId: apptForm.teacherId,
                      slotTime: apptForm.slotTime,
                      status: apptForm.status,
                      parentRemarks: apptForm.parentRemarks,
                      teacherRemarks: apptForm.teacherRemarks,
                    },
                    editingAppt?.id,
                  );
                  if (ok) setApptModal(false);
                  else Alert.alert('Save failed', pp.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* New Communication modal */}
      <Modal
        visible={commModal}
        animationType="slide"
        onRequestClose={() => setCommModal(false)}
      >
        <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {editingComm ? 'Edit Communication' : 'New Communication'}
            </Text>
            <TouchableOpacity onPress={() => setCommModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <FormField label="Student" required>
              <SelectField
                value={commForm.studentId}
                onChange={(v) =>
                  setCommForm((f) => ({ ...f, studentId: v, parentId: '' }))
                }
                options={studentOpts}
                placeholder="Select student…"
              />
            </FormField>
            {!pp.academicYearId ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                Select an academic year to load students.
              </Text>
            ) : null}
            <FormField label="Parent / Guardian" required>
              <SelectField
                value={commForm.parentId}
                onChange={(v) => setCommForm((f) => ({ ...f, parentId: v }))}
                options={guardianOpts}
                placeholder={
                  commForm.studentId ? 'Select parent…' : 'Select a student first'
                }
                disabled={!commForm.studentId}
              />
            </FormField>
            {commForm.studentId && pp.guardians.length === 0 ? (
              <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
                No guardian on file for this student. Add one under Students → Guardians.
              </Text>
            ) : null}
            <FormField label="Type">
              <SelectField
                value={commForm.commType}
                onChange={(v) => setCommForm((f) => ({ ...f, commType: v }))}
                options={commTypeFormOpts}
              />
            </FormField>
            <FormField label="Subject" required>
              <TextField
                value={commForm.subject}
                onChangeText={(t) => setCommForm((f) => ({ ...f, subject: t }))}
              />
            </FormField>
            <FormField label="Message" required>
              <TextField
                value={commForm.message}
                onChangeText={(t) => setCommForm((f) => ({ ...f, message: t }))}
                multiline
              />
            </FormField>
            {editingComm ? (
              <>
                <FormField label="Reply">
                  <TextField
                    value={commForm.reply}
                    onChangeText={(t) => setCommForm((f) => ({ ...f, reply: t }))}
                    multiline
                  />
                </FormField>
                <FormField label="Status">
                  <SelectField
                    value={commForm.status}
                    onChange={(v) => setCommForm((f) => ({ ...f, status: v }))}
                    options={COMM_STATUSES.map((s) => ({ label: s, value: s }))}
                  />
                </FormField>
              </>
            ) : null}
            <PrimaryButton
              label={pp.busy ? 'Saving…' : 'Save'}
              disabled={pp.busy}
              onPress={() => {
                void (async () => {
                  const ok = await pp.saveCommunication(
                    {
                      studentId: commForm.studentId,
                      parentId: commForm.parentId,
                      commType: commForm.commType,
                      subject: commForm.subject,
                      message: commForm.message,
                      reply: commForm.reply,
                      status: commForm.status,
                    },
                    editingComm?.id,
                  );
                  if (ok) setCommModal(false);
                  else Alert.alert('Save failed', pp.error || 'Could not save');
                })();
              }}
            />
          </ScrollView>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },
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
    borderRadius: 12,
    borderWidth: 1.5,
  },
  modalRoot: { flex: 1, paddingTop: 48 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalBody: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
});
