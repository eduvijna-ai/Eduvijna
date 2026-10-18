/**
 * Admin Teacher Detail — web TeachersTab TeacherDetailPanel parity.
 * Rich hero + sectioned profile (Personal / Contact / Employment / Address),
 * live staff GET, and tabs: Timetable · Assigned Classes · Leave · Notes ·
 * Documents · Bank · Attendance.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  leaveApplicationsApi,
  staffProfilesApi,
  timetableSlotsApi,
  uploadApi,
} from '@core/api/erp.api';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  Avatar,
  PrimaryButton,
  IconTabs,
  EmptyState,
  ScreenLoader,
  Badge,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { accentColors } from '../../../theme/accents';
import {
  useAdminClassOverviewData,
  type AdminStaffMember,
} from '../../../hooks/useAdminClassOverviewData';
import { useAdminNavigation } from '../../../hooks/useAdminNavigation';
import { useSchoolsSession } from '../../../hooks/useSchoolsSession';
import {
  DAY_NAMES,
  fmtSlotTime,
  slotAccent,
  type TeacherTimetableSlot,
} from '../../../hooks/useTeacherTimetable';
import type { AdminStackParamList } from '../../../types/navigation';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
} from '../../../utils/apiHelpers';
import { formatApaarId } from '../../../utils/apaarId';

type DetailTab =
  | 'profile'
  | 'timetable'
  | 'assigned_classes'
  | 'leave_history'
  | 'notes'
  | 'documents'
  | 'bank_details'
  | 'attendance';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'timetable', label: 'Time Table' },
  { key: 'assigned_classes', label: 'Assigned Classes' },
  { key: 'leave_history', label: 'Leave History' },
  { key: 'notes', label: 'Notes' },
  { key: 'documents', label: 'Documents' },
  { key: 'bank_details', label: 'Bank Details' },
  { key: 'attendance', label: 'Attendance' },
];

type StaffDoc = { name: string; url: string; type: string; uploadedAt: string };
type LeaveRow = {
  id: string;
  fromDate: string;
  toDate: string;
  days: string;
  reason: string;
  status: string;
};

function unwrapRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const o = raw as Record<string, unknown>;
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>;
  }
  return o;
}

function titleCaseToken(v: string): string {
  if (!v || v === '—') return v;
  return v
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayOrDash(v?: string | null): string {
  const s = (v ?? '').trim();
  return !s || s === '—' ? '—' : s;
}

function mapStaffRaw(raw: unknown, fallback?: AdminStaffMember | null): AdminStaffMember {
  const s = unwrapRecord(raw);
  const firstName = pickString(s.first_name, fallback?.firstName);
  const lastName = pickString(s.last_name, fallback?.lastName);
  const fullFromParts = [firstName, lastName].filter(Boolean).join(' ');
  const name =
    fullFromParts ||
    pickString(s.full_name, s.name, s.staff_name, fallback?.name, 'Staff');
  const statusRaw = pickString(s.status, fallback?.status).toLowerCase();
  const isActive =
    s.is_active === false || statusRaw === 'inactive' || statusRaw === 'deactivated'
      ? false
      : true;
  const teaching =
    pickString(s.designation, fallback?.designation).trim().toLowerCase() === 'instructor';

  return {
    id: pickString(s.id, fallback?.id, 'staff'),
    profileId: s.id != null ? pickNumber(s.id) : fallback?.profileId ?? null,
    userId: s.user_id != null ? pickNumber(s.user_id) : fallback?.userId ?? null,
    name,
    firstName: firstName || name.split(' ')[0] || '',
    lastName,
    employeeId:
      pickString(s.employee_code, s.employee_id, fallback?.employeeId, '—') || '—',
    designation: pickString(s.designation, fallback?.designation, '—') || '—',
    department: pickString(s.department, s.department_name, fallback?.department, '—') || '—',
    employmentType:
      pickString(s.employment_type, s.employment_status, fallback?.employmentType, '—') || '—',
    status: statusRaw || (isActive ? 'active' : 'inactive'),
    isTeaching: teaching,
    isActive,
    email: pickString(s.email, s.work_email, fallback?.email),
    phone: pickString(s.phone, s.mobile, fallback?.phone),
    gender: pickString(s.gender, fallback?.gender),
    dateOfBirth: pickString(s.date_of_birth, fallback?.dateOfBirth),
    dateOfJoining: pickString(
      s.date_of_joining,
      s.joining_date,
      s.joined_on,
      fallback?.dateOfJoining,
    ),
    qualification: pickString(s.qualification, fallback?.qualification),
    experienceYears:
      s.experience_years != null && s.experience_years !== ''
        ? pickNumber(s.experience_years)
        : fallback?.experienceYears ?? null,
    address: pickString(s.address, fallback?.address),
    apaarId: pickString(s.apaar_id, fallback?.apaarId),
    bankName: pickString(s.bank_name, fallback?.bankName),
    bankAccount: pickString(s.bank_account, fallback?.bankAccount),
    ifscCode: pickString(s.ifsc_code, fallback?.ifscCode),
    panNumber: pickString(s.pan_number, fallback?.panNumber),
    basicSalary:
      s.basic_salary != null && s.basic_salary !== ''
        ? pickNumber(s.basic_salary)
        : fallback?.basicSalary ?? null,
    avatarUrl: pickString(s.avatar_url, s.photo_url, fallback?.avatarUrl) || undefined,
  };
}

function mapSlot(raw: Record<string, unknown>, index: number): TeacherTimetableSlot {
  return {
    id: pickString(raw.id, `slot-${index}`),
    templateId: pickNumber(raw.template_id, raw.templateId),
    dayOfWeek: pickNumber(raw.day_of_week, raw.dayOfWeek),
    periodNumber: pickNumber(
      raw.period_number,
      raw.periodNumber,
      raw.period_no,
      raw.period,
      index + 1,
    ),
    startTime: pickString(raw.start_time, raw.startTime, raw.from_time),
    endTime: pickString(raw.end_time, raw.endTime, raw.to_time),
    subjectName: pickString(raw.subject_name, raw.subjectName, raw.subject, raw.slot_type, 'Period'),
    className: pickString(raw.class_name, raw.className),
    sectionName: pickString(raw.section_name, raw.sectionName),
    room: pickString(raw.room, raw.room_name, raw.roomName),
    slotType: pickString(raw.slot_type, raw.slotType, 'lecture'),
    teacherName: pickString(raw.teacher_name, raw.teacherName),
  };
}

function ReadRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  last?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <View
      style={[
        styles.readRow,
        !last && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.readLeft}>
        {icon ? (
          <View style={[styles.readIcon, { backgroundColor: theme.colors.tintTeal }]}>
            <Ionicons name={icon} size={15} color={theme.colors.primary} />
          </View>
        ) : null}
        <Text style={[styles.readLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
      <Text
        style={[styles.readValue, { color: theme.colors.textPrimary }]}
        numberOfLines={4}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  multiline?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          },
        ]}
      />
    </View>
  );
}

export default function AdminTeacherDetailScreen() {
  const theme = useTeacherTheme();
  const navigation = useAdminNavigation();
  const route = useRoute<RouteProp<AdminStackParamList, 'AdminTeacherDetail'>>();
  const { schoolId } = useSchoolsSession();
  const {
    getStaffById,
    classes,
    status: rosterStatus,
    refetch,
  } = useAdminClassOverviewData();

  const staffId = route.params?.staffId;
  const openEdit = !!route.params?.openEdit;
  const listMember = getStaffById(staffId);

  const [teacher, setTeacher] = useState<AdminStaffMember | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('profile');
  const [editing, setEditing] = useState(openEdit);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [qualification, setQualification] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');

  const [slots, setSlots] = useState<TeacherTimetableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [docs, setDocs] = useState<StaffDoc[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  const profileId =
    teacher?.profileId ??
    listMember?.profileId ??
    (staffId && /^\d+$/.test(staffId) ? Number(staffId) : null);

  const notesKey = profileId != null ? `staff_notes_${profileId}` : '';
  const docsKey = profileId != null ? `staff_docs_${profileId}` : '';

  const hydrateForm = useCallback((m: AdminStaffMember) => {
    setPhone(m.phone || '');
    setEmail(m.email || '');
    setDepartment(m.department === '—' ? '' : m.department);
    setQualification(m.qualification || '');
    setAddress(m.address || '');
    setGender(m.gender || '');
  }, []);

  const loadDetail = useCallback(async () => {
    setDetailLoading(true);
    const fallback = listMember ?? null;
    if (profileId == null) {
      setTeacher(fallback);
      if (fallback) hydrateForm(fallback);
      setDetailLoading(false);
      return;
    }
    try {
      const raw = await staffProfilesApi.get(profileId, schoolId ?? undefined);
      const mapped = mapStaffRaw(raw, fallback);
      setTeacher(mapped);
      hydrateForm(mapped);
    } catch {
      setTeacher(fallback);
      if (fallback) hydrateForm(fallback);
    } finally {
      setDetailLoading(false);
    }
  }, [profileId, schoolId, listMember, hydrateForm]);

  useEffect(() => {
    if (rosterStatus === 'loading' || rosterStatus === 'idle') return;
    void loadDetail();
    // Re-run when roster member resolves or school/staff route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: listMember id + roster
  }, [staffId, schoolId, listMember?.id, rosterStatus]);

  useEffect(() => {
    setEditing(openEdit);
  }, [openEdit, staffId]);

  useEffect(() => {
    if (!notesKey) return;
    void AsyncStorage.getItem(notesKey).then((v) => setNotes(v || ''));
  }, [notesKey]);

  useEffect(() => {
    if (!docsKey) return;
    void AsyncStorage.getItem(docsKey).then((raw) => {
      try {
        setDocs(raw ? (JSON.parse(raw) as StaffDoc[]) : []);
      } catch {
        setDocs([]);
      }
    });
  }, [docsKey]);

  useEffect(() => {
    if (tab !== 'timetable' || !teacher?.userId) return;
    let cancelled = false;
    setSlotsLoading(true);
    timetableSlotsApi
      .list({
        teacher_id: teacher.userId,
        per_page: 200,
        school_id: schoolId ?? undefined,
      })
      .then((raw) => {
        if (!cancelled) setSlots(safeList<Record<string, unknown>>(raw).map(mapSlot));
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, teacher?.userId, schoolId]);

  useEffect(() => {
    if (tab !== 'leave_history' || profileId == null) return;
    let cancelled = false;
    setLeavesLoading(true);
    leaveApplicationsApi
      .list({
        staff_id: profileId,
        per_page: 100,
        school_id: schoolId ?? undefined,
      })
      .then((raw) => {
        if (cancelled) return;
        setLeaves(
          safeList<Record<string, unknown>>(raw).map((l, i) => ({
            id: pickString(l.id, `leave-${i}`),
            fromDate: formatDisplayDate(pickString(l.from_date)) || pickString(l.from_date, '—'),
            toDate: formatDisplayDate(pickString(l.to_date)) || pickString(l.to_date, '—'),
            days: String(l.days ?? '—'),
            reason: pickString(l.reason, '—'),
            status: pickString(l.status, 'pending'),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setLeaves([]);
      })
      .finally(() => {
        if (!cancelled) setLeavesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, profileId, schoolId]);

  const assignments = useMemo(() => {
    if (!teacher?.userId) return [];
    return classes.filter((c) => c.teacherId === teacher.userId);
  }, [classes, teacher?.userId]);

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => s.dayOfWeek === selectedDay)
        .sort((a, b) => a.periodNumber - b.periodNumber),
    [slots, selectedDay],
  );

  const saveNotes = useCallback(
    async (val: string) => {
      setNotes(val);
      if (notesKey) {
        try {
          await AsyncStorage.setItem(notesKey, val);
        } catch {
          /* ignore */
        }
      }
    },
    [notesKey],
  );

  const persistDocs = useCallback(
    async (next: StaffDoc[]) => {
      setDocs(next);
      if (docsKey) {
        try {
          await AsyncStorage.setItem(docsKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [docsKey],
  );

  const onSaveProfile = useCallback(async () => {
    if (profileId == null) return;
    setSaving(true);
    try {
      await staffProfilesApi.update(
        profileId,
        {
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          department: department.trim() || undefined,
          qualification: qualification.trim() || undefined,
          address: address.trim() || undefined,
          gender: gender.trim() || undefined,
        },
        schoolId ?? undefined,
      );
      await refetch();
      await loadDetail();
      setEditing(false);
      Alert.alert('Saved', 'Staff profile updated.');
    } catch (e) {
      Alert.alert('Update failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [
    profileId,
    phone,
    email,
    department,
    qualification,
    address,
    gender,
    schoolId,
    refetch,
    loadDetail,
  ]);

  const onDeactivate = useCallback(() => {
    if (profileId == null) return;
    Alert.alert('Deactivate staff?', 'This will soft-delete the staff profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await staffProfilesApi.softDelete(profileId, schoolId ?? undefined);
              await refetch();
              navigation.goBack();
            } catch (e) {
              Alert.alert('Failed', extractErrorMessage(e));
            }
          })();
        },
      },
    ]);
  }, [profileId, schoolId, refetch, navigation]);

  const onUploadDoc = useCallback(async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', '*/*'],
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const file = picked.assets[0];
      setDocUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name || 'document',
        type: file.mimeType || 'application/octet-stream',
      } as unknown as Blob);
      const res = (await uploadApi.uploadDocument(formData)) as {
        url?: string;
        filename?: string;
      };
      if (!res?.url) {
        Alert.alert('Upload failed', 'No URL returned');
        return;
      }
      await persistDocs([
        ...docs,
        {
          name: res.filename || file.name || 'Document',
          url: res.url,
          type: file.mimeType || 'file',
          uploadedAt: new Date().toISOString().slice(0, 10),
        },
      ]);
    } catch (e) {
      Alert.alert('Upload failed', extractErrorMessage(e));
    } finally {
      setDocUploading(false);
    }
  }, [docs, persistDocs]);

  const rosterLoading = rosterStatus === 'idle' || rosterStatus === 'loading';
  if (rosterLoading && !listMember && detailLoading) {
    return (
      <TeacherScreen header={<ScreenHeader title="Staff Profile" showBack />}>
        <ScreenLoader message="Loading staff…" />
      </TeacherScreen>
    );
  }

  if (!teacher && !detailLoading) {
    return (
      <TeacherScreen header={<ScreenHeader title="Staff Profile" showBack />}>
        <EmptyState
          icon="person-outline"
          title="Staff not found"
          message="Return to the staff list and try again."
        />
      </TeacherScreen>
    );
  }

  const activeMember = teacher ?? listMember;
  if (!activeMember) {
    return (
      <TeacherScreen header={<ScreenHeader title="Staff Profile" showBack />}>
        <ScreenLoader message="Loading profile details…" />
      </TeacherScreen>
    );
  }

  const active = activeMember.status === 'active' || activeMember.isActive;
  const joiningLabel =
    formatDisplayDate(activeMember.dateOfJoining) ||
    displayOrDash(activeMember.dateOfJoining);
  const dobLabel =
    formatDisplayDate(activeMember.dateOfBirth) || displayOrDash(activeMember.dateOfBirth);
  const empType = titleCaseToken(activeMember.employmentType);
  const designationLabel = titleCaseToken(activeMember.designation);

  return (
    <TeacherScreen
      header={<ScreenHeader title="Staff Profile" showBack />}
      contentStyle={styles.content}
      footer={
        editing ? (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                hydrateForm(activeMember);
                setEditing(false);
              }}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              onPress={() => void onSaveProfile()}
              disabled={saving}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Edit Profile"
              variant="outline"
              icon="create-outline"
              onPress={() => setEditing(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Deactivate"
              variant="outline"
              onPress={onDeactivate}
              style={{ flex: 1 }}
            />
          </View>
        )
      }
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={activeMember.name} uri={activeMember.avatarUrl} size={68} accent="green" />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName} numberOfLines={2}>
              {activeMember.name.toUpperCase()}
            </Text>
            <Text style={styles.heroMeta}>
              ID: {activeMember.profileId ?? activeMember.id}
              {activeMember.employeeId && activeMember.employeeId !== '—'
                ? ` · ${activeMember.employeeId}`
                : ''}
            </Text>
            <View style={styles.heroChips}>
              <View style={styles.heroChip}>
                <Text style={styles.heroChipText}>{active ? 'Active' : 'Inactive'}</Text>
              </View>
              {activeMember.designation && activeMember.designation !== '—' ? (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{designationLabel}</Text>
                </View>
              ) : null}
              {empType && empType !== '—' ? (
                <View style={styles.heroChip}>
                  <Text style={styles.heroChipText}>{empType}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </HeroCard>

      {detailLoading ? (
        <ScreenLoader message="Loading profile details…" fill={false} />
      ) : editing ? (
        <SurfaceCard>
          <SectionHeader title="Edit Staff Profile" />
          <View style={styles.form}>
            <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <EditField
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <EditField label="Gender" value={gender} onChangeText={setGender} placeholder="Male / Female / Other" />
            <EditField label="Department" value={department} onChangeText={setDepartment} />
            <EditField
              label="Qualification"
              value={qualification}
              onChangeText={setQualification}
            />
            <EditField
              label="Address"
              value={address}
              onChangeText={setAddress}
              multiline
            />
          </View>
        </SurfaceCard>
      ) : (
        <>
          <IconTabs
            tabs={TABS}
            activeKey={tab}
            onChange={(k) => setTab(k as DetailTab)}
            scrollable
          />

          {tab === 'profile' ? (
            <View style={styles.tabBody}>
              <SurfaceCard padded={false}>
                <View style={styles.sectionPad}>
                  <SectionHeader title="Personal" />
                </View>
                <ReadRow
                  icon="id-card-outline"
                  label="APAAR ID"
                  value={
                    activeMember.apaarId ? formatApaarId(activeMember.apaarId) : '—'
                  }
                />
                <ReadRow icon="male-female-outline" label="Gender" value={displayOrDash(activeMember.gender)} />
                <ReadRow icon="cafe-outline" label="Date of Birth" value={dobLabel} last />
              </SurfaceCard>

              <SurfaceCard padded={false}>
                <View style={styles.sectionPad}>
                  <SectionHeader title="Contact" />
                </View>
                <ReadRow
                  icon="mail-outline"
                  label="Email"
                  value={displayOrDash(activeMember.email)}
                />
                <ReadRow
                  icon="call-outline"
                  label="Phone"
                  value={displayOrDash(activeMember.phone)}
                  last
                />
              </SurfaceCard>

              <SurfaceCard padded={false}>
                <View style={styles.sectionPad}>
                  <SectionHeader title="Employment" />
                </View>
                <ReadRow
                  icon="calendar-outline"
                  label="Joining Date"
                  value={joiningLabel}
                />
                <ReadRow
                  icon="briefcase-outline"
                  label="Designation"
                  value={displayOrDash(designationLabel)}
                />
                <ReadRow
                  icon="business-outline"
                  label="Department"
                  value={displayOrDash(activeMember.department)}
                />
                <ReadRow
                  icon="school-outline"
                  label="Qualification"
                  value={displayOrDash(activeMember.qualification)}
                />
                <ReadRow
                  icon="time-outline"
                  label="Experience"
                  value={
                    activeMember.experienceYears != null
                      ? `${activeMember.experienceYears} years`
                      : '—'
                  }
                />
                <ReadRow
                  icon="people-outline"
                  label="Employment Type"
                  value={displayOrDash(empType)}
                  last
                />
              </SurfaceCard>

              <SurfaceCard padded={false}>
                <View style={styles.sectionPad}>
                  <SectionHeader title="Address" />
                </View>
                <ReadRow
                  icon="location-outline"
                  label="Address"
                  value={displayOrDash(activeMember.address)}
                  last
                />
              </SurfaceCard>
            </View>
          ) : null}

          {tab === 'timetable' ? (
            <View style={styles.tabBody}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.dayRow}>
                  {DAY_NAMES.map((label, index) => {
                    const activeDay = selectedDay === index;
                    return (
                      <TouchableOpacity
                        key={label}
                        style={[
                          styles.dayChip,
                          {
                            backgroundColor: activeDay
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: activeDay
                              ? theme.colors.primary
                              : theme.colors.border,
                          },
                        ]}
                        onPress={() => setSelectedDay(index)}
                      >
                        <Text
                          style={{
                            color: activeDay ? '#fff' : theme.colors.textSecondary,
                            fontWeight: '700',
                            fontSize: 12,
                          }}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
              {slotsLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
              ) : daySlots.length === 0 ? (
                <EmptyState
                  icon="calendar-outline"
                  title="No timetable slots"
                  message="No timetable slots assigned."
                />
              ) : (
                daySlots.map((slot) => {
                  const tint = accentColors(theme.colors, slotAccent(slot.slotType));
                  return (
                    <SurfaceCard key={slot.id} padded={false} style={styles.slotCard}>
                      <View style={[styles.slotAccent, { backgroundColor: tint.fg }]} />
                      <View style={styles.slotBody}>
                        <Text style={[styles.slotTitle, { color: theme.colors.textPrimary }]}>
                          {slot.subjectName}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {[slot.className, slot.sectionName].filter(Boolean).join(' · ') ||
                            '—'}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {fmtSlotTime(slot.startTime)} – {fmtSlotTime(slot.endTime)}
                          {slot.room ? ` · ${slot.room}` : ''}
                        </Text>
                      </View>
                    </SurfaceCard>
                  );
                })
              )}
            </View>
          ) : null}

          {tab === 'assigned_classes' ? (
            <View style={styles.tabBody}>
              {assignments.length === 0 ? (
                <EmptyState
                  icon="school-outline"
                  title="No assignments"
                  message="No class assignments found."
                />
              ) : (
                <SurfaceCard padded={false}>
                  <View style={[styles.assignHeader, { borderBottomColor: theme.colors.border }]}>
                    <Text style={[styles.assignCol, styles.assignHead, { flex: 1.1 }]}>Class</Text>
                    <Text style={[styles.assignCol, styles.assignHead, { flex: 0.8 }]}>Sec</Text>
                    <Text style={[styles.assignCol, styles.assignHead, { flex: 1.2 }]}>
                      Subject
                    </Text>
                    <Text style={[styles.assignCol, styles.assignHead, { flex: 0.7 }]}>CT</Text>
                  </View>
                  {assignments.map((a, i) => (
                    <View
                      key={`${a.id}-${i}`}
                      style={[
                        styles.assignRow,
                        i < assignments.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.assignCol, { flex: 1.1, color: theme.colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {a.className || a.name || '—'}
                      </Text>
                      <Text
                        style={[
                          styles.assignCol,
                          { flex: 0.8, color: theme.colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {a.sectionName || '—'}
                      </Text>
                      <Text
                        style={[
                          styles.assignCol,
                          { flex: 1.2, color: theme.colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {a.subject || '—'}
                      </Text>
                      <Text
                        style={[
                          styles.assignCol,
                          {
                            flex: 0.7,
                            color: a.isClassTeacher ? '#15803d' : theme.colors.textSecondary,
                            fontWeight: a.isClassTeacher ? '700' : '500',
                          },
                        ]}
                      >
                        {a.isClassTeacher ? 'Yes' : '—'}
                      </Text>
                    </View>
                  ))}
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {tab === 'leave_history' ? (
            <View style={styles.tabBody}>
              {leavesLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
              ) : leaves.length === 0 ? (
                <EmptyState
                  icon="airplane-outline"
                  title="No leave records"
                  message="No leave records found."
                />
              ) : (
                leaves.map((l) => {
                  const ok = l.status.toLowerCase() === 'approved';
                  const bad = l.status.toLowerCase() === 'rejected';
                  return (
                    <SurfaceCard key={l.id}>
                      <View style={styles.leaveHeader}>
                        <Text style={[styles.slotTitle, { color: theme.colors.textPrimary }]}>
                          {l.fromDate} → {l.toDate}
                        </Text>
                        <Badge
                          label={titleCaseToken(l.status)}
                          accent={ok ? 'green' : bad ? 'red' : 'orange'}
                        />
                      </View>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                        Days · {l.days}
                      </Text>
                      <Text
                        style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}
                      >
                        {l.reason}
                      </Text>
                    </SurfaceCard>
                  );
                })
              )}
            </View>
          ) : null}

          {tab === 'notes' ? (
            <SurfaceCard>
              <SectionHeader title="Private Notes" />
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Saved on this device (same as web local notes).
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    backgroundColor: theme.colors.background,
                  },
                ]}
                value={notes}
                onChangeText={(v) => void saveNotes(v)}
                placeholder="Add notes about this staff member…"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                textAlignVertical="top"
              />
            </SurfaceCard>
          ) : null}

          {tab === 'documents' ? (
            <View style={styles.tabBody}>
              <PrimaryButton
                label={docUploading ? 'Uploading…' : 'Upload Document'}
                icon="cloud-upload-outline"
                size="compact"
                onPress={() => void onUploadDoc()}
                disabled={docUploading}
              />
              {docs.length === 0 ? (
                <EmptyState
                  icon="document-outline"
                  title="No documents"
                  message="No documents uploaded."
                />
              ) : (
                <SurfaceCard padded={false}>
                  {docs.map((d, i) => (
                    <View
                      key={`${d.url}-${i}`}
                      style={[
                        styles.docRow,
                        i < docs.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docTitle, { color: theme.colors.textPrimary }]}>
                          {d.name}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          Uploaded · {d.uploadedAt}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => void Linking.openURL(d.url)}>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                          View
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void persistDocs(docs.filter((_, idx) => idx !== i))}
                        style={{ marginLeft: 12 }}
                      >
                        <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 12 }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </SurfaceCard>
              )}
            </View>
          ) : null}

          {tab === 'bank_details' ? (
            <SurfaceCard padded={false}>
              <View style={styles.sectionPad}>
                <SectionHeader title="Bank & Salary" />
              </View>
              <ReadRow
                icon="business-outline"
                label="Bank Name"
                value={displayOrDash(activeMember.bankName)}
              />
              <ReadRow
                icon="card-outline"
                label="Account Number"
                value={displayOrDash(activeMember.bankAccount)}
              />
              <ReadRow
                icon="key-outline"
                label="IFSC Code"
                value={displayOrDash(activeMember.ifscCode)}
              />
              <ReadRow
                icon="document-text-outline"
                label="PAN Number"
                value={displayOrDash(activeMember.panNumber)}
              />
              <ReadRow
                icon="cash-outline"
                label="Basic Salary"
                value={
                  activeMember.basicSalary != null
                    ? `₹${activeMember.basicSalary.toLocaleString('en-IN')}`
                    : '—'
                }
                last
              />
            </SurfaceCard>
          ) : null}

          {tab === 'attendance' ? (
            <SurfaceCard>
              <SectionHeader title="Staff Attendance" />
              <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
                Staff attendance tracking is available in the Attendance module.
              </Text>
              <Text style={[styles.hint, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Open Attendance → Staff Attendance to view or mark attendance for this staff
                member.
              </Text>
              <View style={{ marginTop: 14 }}>
                <PrimaryButton
                  label="Open Attendance"
                  size="compact"
                  variant="outline"
                  icon="calendar-outline"
                  onPress={() => navigation.navigate('AttendanceDashboard')}
                />
              </View>
            </SurfaceCard>
          ) : null}
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14, paddingBottom: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroInfo: { flex: 1, gap: 6 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 0.4 },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tabBody: { gap: 12 },
  sectionPad: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  readRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  readLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  readIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readLabel: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  readValue: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1.15,
    textAlign: 'right',
    lineHeight: 20,
  },
  form: { gap: 10 },
  field: { gap: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  footerRow: { flexDirection: 'row', gap: 10 },
  dayRow: { flexDirection: 'row', gap: 8, paddingVertical: 2, paddingRight: 4 },
  dayChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  slotCard: { flexDirection: 'row', overflow: 'hidden' },
  slotAccent: { width: 4 },
  slotBody: { flex: 1, gap: 2, padding: 14 },
  slotTitle: { fontSize: 14, fontWeight: '700' },
  assignHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  assignRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  assignCol: { fontSize: 12 },
  assignHead: { fontWeight: '800', color: '#64748b', fontSize: 11, textTransform: 'uppercase' },
  leaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  hint: { fontSize: 13, lineHeight: 19 },
  notesInput: {
    marginTop: 10,
    minHeight: 160,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  docTitle: { fontSize: 14, fontWeight: '700' },
});
