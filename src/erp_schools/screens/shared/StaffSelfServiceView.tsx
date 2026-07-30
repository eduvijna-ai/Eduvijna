/**
 * Staff Self-Service — web StaffSelfServiceTab parity (Class Overview → My Profile).
 * Tabs: Profile | Time Table | Assigned Classes | Leave History | Notes |
 * Documents | Bank Details
 *
 * APIs: staff/me, class-overview (assignments), timetable slots, leave-types,
 * leave-applications, upload/document. Notes/docs persisted locally.
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
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  leaveApplicationsApi,
  leaveTypesApi,
  staffProfilesApi,
  timetableSlotsApi,
  uploadApi,
} from '@core/api/erp.api';
import {
  SurfaceCard,
  SectionHeader,
  Avatar,
  PrimaryButton,
  IconTabs,
  EmptyState,
  ScreenLoader,
  Badge,
  InfoBanner,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { accentColors } from '../../theme/accents';
import { useSchoolsSession } from '../../hooks/useSchoolsSession';
import {
  DAY_NAMES,
  fmtSlotTime,
  slotAccent,
  type TeacherTimetableSlot,
} from '../../hooks/useTeacherTimetable';
import type { ClassInfo } from '../../types/domain';
import {
  extractErrorMessage,
  formatDisplayDate,
  pickNumber,
  pickString,
  safeList,
} from '../../utils/apiHelpers';

type SelfTab =
  | 'profile'
  | 'timetable'
  | 'assigned_classes'
  | 'leave_history'
  | 'notes'
  | 'documents'
  | 'bank_details';

const SELF_TABS: { key: SelfTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'timetable', label: 'Time Table' },
  { key: 'assigned_classes', label: 'Assigned Classes' },
  { key: 'leave_history', label: 'Leave History' },
  { key: 'notes', label: 'Notes' },
  { key: 'documents', label: 'Documents' },
  { key: 'bank_details', label: 'Bank Details' },
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
type LeaveTypeOpt = { id: number; name: string; maxDays: number };

type SelfProfile = {
  id: number | null;
  schoolId: number | null;
  userId: number | null;
  name: string;
  firstName: string;
  employeeCode: string;
  designation: string;
  department: string;
  status: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  dateOfJoining: string;
  qualification: string;
  experienceYears: number | null;
  employmentType: string;
  address: string;
  bankName: string;
  bankAccount: string;
  ifscCode: string;
  panNumber: string;
  basicSalary: number | null;
  avatarUrl?: string;
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
  return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function dash(v?: string | null): string {
  const s = (v ?? '').trim();
  return !s || s === '—' ? '—' : s;
}

function mapSelfProfile(
  raw: unknown,
  fallbackName: string,
  fallbackEmail: string,
): SelfProfile | null {
  const s = unwrapRecord(raw);
  if (!s || Object.keys(s).length === 0) return null;
  const firstName = pickString(s.first_name);
  const lastName = pickString(s.last_name);
  const name =
    [firstName, lastName].filter(Boolean).join(' ') ||
    pickString(s.full_name, s.name, fallbackName, 'Staff');
  if (!pickString(s.id) && !name) return null;
  return {
    id: s.id != null ? pickNumber(s.id) : null,
    schoolId: s.school_id != null ? pickNumber(s.school_id) : null,
    userId: s.user_id != null ? pickNumber(s.user_id) : null,
    name,
    firstName: firstName || name.charAt(0),
    employeeCode: pickString(s.employee_code, s.employee_id),
    designation: pickString(s.designation),
    department: pickString(s.department, s.department_name),
    status: pickString(s.status, 'active').toLowerCase() || 'active',
    gender: pickString(s.gender),
    dateOfBirth: pickString(s.date_of_birth),
    email: pickString(s.email, s.work_email, fallbackEmail),
    phone: pickString(s.phone, s.mobile),
    dateOfJoining: pickString(s.date_of_joining, s.joining_date, s.joined_on),
    qualification: pickString(s.qualification),
    experienceYears:
      s.experience_years != null && s.experience_years !== ''
        ? pickNumber(s.experience_years)
        : null,
    employmentType: pickString(s.employment_type),
    address: pickString(s.address),
    bankName: pickString(s.bank_name),
    bankAccount: pickString(s.bank_account),
    ifscCode: pickString(s.ifsc_code),
    panNumber: pickString(s.pan_number),
    basicSalary:
      s.basic_salary != null && s.basic_salary !== ''
        ? pickNumber(s.basic_salary)
        : null,
    avatarUrl: pickString(s.avatar_url, s.photo_url) || undefined,
  };
}

function mapSlot(raw: Record<string, unknown>, index: number): TeacherTimetableSlot {
  return {
    id: pickString(raw.id, `slot-${index}`),
    templateId: pickNumber(raw.template_id),
    dayOfWeek: pickNumber(raw.day_of_week),
    periodNumber: pickNumber(raw.period_number, index + 1),
    startTime: pickString(raw.start_time),
    endTime: pickString(raw.end_time),
    subjectName: pickString(raw.subject_name, raw.slot_type, 'Period'),
    className: pickString(raw.class_name),
    sectionName: pickString(raw.section_name),
    room: pickString(raw.room),
    slotType: pickString(raw.slot_type, 'lecture'),
    teacherName: pickString(raw.teacher_name),
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
      <Text style={[styles.readValue, { color: theme.colors.textPrimary }]} numberOfLines={4}>
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
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
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

export interface StaffSelfServiceViewProps {
  /** School-wide class overview rows (for Assigned Classes). */
  classRows?: ClassInfo[];
}

export default function StaffSelfServiceView({ classRows = [] }: StaffSelfServiceViewProps) {
  const theme = useTeacherTheme();
  const session = useSchoolsSession();
  const schoolId = session.schoolId ?? undefined;

  const [tab, setTab] = useState<SelfTab>('profile');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [address, setAddress] = useState('');

  const [bankEdit, setBankEdit] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [pan, setPan] = useState('');

  const [slots, setSlots] = useState<TeacherTimetableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOpt[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState<number>(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [notes, setNotes] = useState('');
  const [docs, setDocs] = useState<StaffDoc[]>([]);
  const [docUploading, setDocUploading] = useState(false);

  const notesKey = profile?.id != null ? `staff_notes_self_${profile.id}` : '';
  const docsKey = profile?.id != null ? `staff_docs_self_${profile.id}` : '';

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await staffProfilesApi.getMyProfile(schoolId);
      const mapped = mapSelfProfile(raw, session.displayName, session.email);
      setProfile(mapped);
      if (mapped) {
        setPhone(mapped.phone || '');
        setQualification(mapped.qualification || '');
        setExperience(
          mapped.experienceYears != null ? String(mapped.experienceYears) : '',
        );
        setAddress(mapped.address || '');
        setBankName(mapped.bankName || '');
        setBankAccount(mapped.bankAccount || '');
        setIfsc(mapped.ifscCode || '');
        setPan(mapped.panNumber || '');
      }
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [schoolId, session.displayName, session.email]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
    if (tab !== 'timetable' || !profile?.userId) return;
    let cancelled = false;
    setSlotsLoading(true);
    timetableSlotsApi
      .list({ teacher_id: profile.userId, per_page: 200, school_id: schoolId })
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
  }, [tab, profile?.userId, schoolId]);

  const fetchLeaves = useCallback(async () => {
    if (profile?.id == null) return;
    setLeavesLoading(true);
    try {
      const raw = await leaveApplicationsApi.list({
        staff_id: profile.id,
        per_page: 100,
        school_id: schoolId,
      });
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
    } catch {
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  }, [profile?.id, schoolId]);

  useEffect(() => {
    if (tab !== 'leave_history' || !profile) return;
    void fetchLeaves();
    leaveTypesApi
      .list({ school_id: schoolId, per_page: 50 })
      .then((raw) => {
        setLeaveTypes(
          safeList<Record<string, unknown>>(raw).map((lt) => ({
            id: pickNumber(lt.id),
            name: pickString(lt.name, lt.leave_type_name, 'Leave'),
            maxDays: pickNumber(lt.max_days, lt.maxDays, 0),
          })),
        );
      })
      .catch(() => setLeaveTypes([]));
  }, [tab, profile?.id, schoolId, fetchLeaves]);

  const myAssignments = useMemo(() => {
    if (!profile?.userId) return [];
    return classRows.filter((c) => c.teacherId === profile.userId);
  }, [classRows, profile?.userId]);

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

  const startEdit = () => {
    if (!profile) return;
    setPhone(profile.phone || '');
    setQualification(profile.qualification || '');
    setExperience(profile.experienceYears != null ? String(profile.experienceYears) : '');
    setAddress(profile.address || '');
    setEditMode(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await staffProfilesApi.updateMyProfile(
        {
          phone: phone.trim() || undefined,
          qualification: qualification.trim() || undefined,
          experience_years: experience.trim() ? Number(experience) : undefined,
          address: address.trim() || undefined,
        },
        schoolId,
      );
      const mapped = mapSelfProfile(updated, session.displayName, session.email);
      if (mapped) setProfile(mapped);
      else await loadProfile();
      setEditMode(false);
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Update failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const saveBank = async () => {
    setSaving(true);
    try {
      const updated = await staffProfilesApi.updateMyProfile(
        {
          bank_name: bankName.trim() || undefined,
          bank_account: bankAccount.trim() || undefined,
          ifsc_code: ifsc.trim() || undefined,
          pan_number: pan.trim() || undefined,
        },
        schoolId,
      );
      const mapped = mapSelfProfile(updated, session.displayName, session.email);
      if (mapped) setProfile(mapped);
      else await loadProfile();
      setBankEdit(false);
      Alert.alert('Saved', 'Bank details updated.');
    } catch (e) {
      Alert.alert('Update failed', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const submitLeave = async () => {
    if (!profile?.id || !leaveTypeId || !fromDate.trim() || !toDate.trim()) {
      Alert.alert('Required', 'Please fill leave type, from date, and to date.');
      return;
    }
    setLeaveSubmitting(true);
    try {
      await leaveApplicationsApi.create({
        school_id: profile.schoolId ?? schoolId,
        staff_id: profile.id,
        leave_type_id: leaveTypeId,
        from_date: fromDate.trim(),
        to_date: toDate.trim(),
        reason: leaveReason.trim() || undefined,
      });
      setShowLeaveForm(false);
      setLeaveTypeId(0);
      setFromDate('');
      setToDate('');
      setLeaveReason('');
      await fetchLeaves();
      Alert.alert('Submitted', 'Leave application submitted.');
    } catch (e) {
      Alert.alert('Failed', extractErrorMessage(e));
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const onUploadDoc = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', '*/*'],
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
  };

  if (loading) {
    return <ScreenLoader message="Loading your profile…" fill={false} />;
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <SurfaceCard>
          <View style={styles.headerRow}>
            <Avatar name={session.displayName || 'Staff'} size={56} accent="teal" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.headerName, { color: theme.colors.textPrimary }]}>
                {session.displayName || 'Staff'}
              </Text>
              {session.email ? (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                  {session.email}
                </Text>
              ) : null}
            </View>
            <Badge label="Active" accent="green" />
          </View>
        </SurfaceCard>
        <InfoBanner
          tone="tip"
          text="Your detailed staff profile has not been set up yet. Please contact your administrator to complete profile setup (timetable, leave, bank details, etc.)."
        />
      </View>
    );
  }

  const active = profile.status === 'active';
  const joining =
    formatDisplayDate(profile.dateOfJoining) || dash(profile.dateOfJoining);
  const dob = formatDisplayDate(profile.dateOfBirth) || dash(profile.dateOfBirth);

  return (
    <View style={styles.root}>
      <SurfaceCard>
        <View style={styles.headerRow}>
          <Avatar name={profile.name} uri={profile.avatarUrl} size={56} accent="teal" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.headerName, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {profile.name}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }} numberOfLines={2}>
              {[
                profile.employeeCode || null,
                profile.designation || null,
                profile.department || null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Staff'}
            </Text>
          </View>
          <Badge label={active ? 'Active' : titleCaseToken(profile.status)} accent={active ? 'green' : 'red'} />
        </View>
      </SurfaceCard>

      <IconTabs
        tabs={SELF_TABS}
        activeKey={tab}
        onChange={(k) => setTab(k as SelfTab)}
        scrollable
      />

      {tab === 'profile' ? (
        editMode ? (
          <SurfaceCard>
            <SectionHeader title="Edit Profile" />
            <View style={styles.form}>
              <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <EditField
                label="Qualification"
                value={qualification}
                onChangeText={setQualification}
              />
              <EditField
                label="Experience (years)"
                value={experience}
                onChangeText={setExperience}
                keyboardType="number-pad"
              />
              <EditField label="Address" value={address} onChangeText={setAddress} multiline />
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  size="compact"
                  onPress={() => setEditMode(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label={saving ? 'Saving…' : 'Save Changes'}
                  size="compact"
                  onPress={() => void saveProfile()}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <View style={styles.tabBody}>
            <View style={styles.editBtnRow}>
              <PrimaryButton
                label="Edit Profile"
                icon="create-outline"
                size="compact"
                onPress={startEdit}
              />
            </View>
            <SurfaceCard padded={false}>
              <ReadRow icon="male-female-outline" label="Gender" value={dash(profile.gender)} />
              <ReadRow icon="cake-outline" label="Date of Birth" value={dob} />
              <ReadRow icon="mail-outline" label="Email" value={dash(profile.email)} />
              <ReadRow icon="call-outline" label="Phone" value={dash(profile.phone)} />
              <ReadRow icon="calendar-outline" label="Joining Date" value={joining} />
              <ReadRow
                icon="briefcase-outline"
                label="Designation"
                value={dash(titleCaseToken(profile.designation))}
              />
              <ReadRow
                icon="business-outline"
                label="Department"
                value={dash(profile.department)}
              />
              <ReadRow
                icon="school-outline"
                label="Qualification"
                value={dash(profile.qualification)}
              />
              <ReadRow
                icon="time-outline"
                label="Experience"
                value={
                  profile.experienceYears != null ? `${profile.experienceYears} years` : '—'
                }
              />
              <ReadRow
                icon="people-outline"
                label="Employment Type"
                value={dash(titleCaseToken(profile.employmentType))}
              />
              <ReadRow
                icon="location-outline"
                label="Address"
                value={dash(profile.address)}
                last
              />
            </SurfaceCard>
          </View>
        )
      ) : null}

      {tab === 'timetable' ? (
        <View style={styles.tabBody}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dayRow}>
              {DAY_NAMES.map((label, index) => {
                const on = selectedDay === index;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.dayChip,
                      {
                        backgroundColor: on ? theme.colors.primary : theme.colors.surface,
                        borderColor: on ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDay(index)}
                  >
                    <Text
                      style={{
                        color: on ? '#fff' : theme.colors.textSecondary,
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
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
          ) : daySlots.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No timetable slots"
              message="No timetable slots assigned to you."
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
                      {[slot.className, slot.sectionName].filter(Boolean).join(' · ') || '—'}
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
          {myAssignments.length === 0 ? (
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
                <Text style={[styles.assignCol, styles.assignHead, { flex: 1.2 }]}>Subject</Text>
                <Text style={[styles.assignCol, styles.assignHead, { flex: 0.7 }]}>CT</Text>
              </View>
              {myAssignments.map((a, i) => (
                <View
                  key={`${a.id}-${i}`}
                  style={[
                    styles.assignRow,
                    i < myAssignments.length - 1 && {
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
                    style={[styles.assignCol, { flex: 0.8, color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {a.sectionName || '—'}
                  </Text>
                  <Text
                    style={[styles.assignCol, { flex: 1.2, color: theme.colors.textSecondary }]}
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
          <View style={styles.leaveTop}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              {leaves.length} leave record{leaves.length !== 1 ? 's' : ''}
            </Text>
            <PrimaryButton
              label={showLeaveForm ? 'Cancel' : 'Apply for Leave'}
              size="compact"
              variant={showLeaveForm ? 'outline' : 'solid'}
              onPress={() => setShowLeaveForm((v) => !v)}
            />
          </View>

          {showLeaveForm ? (
            <SurfaceCard>
              <SectionHeader title="New Leave Application" />
              <View style={styles.form}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                  Leave Type *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipRow}>
                    {leaveTypes.map((lt) => {
                      const on = leaveTypeId === lt.id;
                      return (
                        <TouchableOpacity
                          key={lt.id}
                          style={[
                            styles.typeChip,
                            {
                              borderColor: on ? theme.colors.primary : theme.colors.border,
                              backgroundColor: on ? theme.colors.primary : theme.colors.background,
                            },
                          ]}
                          onPress={() => setLeaveTypeId(lt.id)}
                        >
                          <Text
                            style={{
                              color: on ? '#fff' : theme.colors.textPrimary,
                              fontSize: 12,
                              fontWeight: '600',
                            }}
                          >
                            {lt.name}
                            {lt.maxDays ? ` (${lt.maxDays}d)` : ''}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
                <EditField
                  label="From Date * (YYYY-MM-DD)"
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="2026-07-29"
                />
                <EditField
                  label="To Date * (YYYY-MM-DD)"
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="2026-07-30"
                />
                <EditField
                  label="Reason"
                  value={leaveReason}
                  onChangeText={setLeaveReason}
                  multiline
                />
                <PrimaryButton
                  label={leaveSubmitting ? 'Submitting…' : 'Submit Application'}
                  onPress={() => void submitLeave()}
                  disabled={leaveSubmitting}
                />
              </View>
            </SurfaceCard>
          ) : null}

          {leavesLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
          ) : leaves.length === 0 ? (
            <EmptyState
              icon="airplane-outline"
              title="No leave records"
              message='Click "Apply for Leave" to submit one.'
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
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
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
          <SectionHeader title="Personal Notes" />
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
            placeholder="Add your personal notes here…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
        </SurfaceCard>
      ) : null}

      {tab === 'documents' ? (
        <View style={styles.tabBody}>
          <PrimaryButton
            label={docUploading ? 'Uploading…' : 'Upload Certificate / Document'}
            icon="cloud-upload-outline"
            size="compact"
            onPress={() => void onUploadDoc()}
            disabled={docUploading}
          />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            Upload certificates, ID proofs, educational documents, etc.
          </Text>
          {docs.length === 0 ? (
            <EmptyState
              icon="document-outline"
              title="No documents"
              message="No documents uploaded yet."
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
        bankEdit ? (
          <SurfaceCard>
            <SectionHeader title="Edit Bank Details" />
            <View style={styles.form}>
              <EditField label="Bank Name" value={bankName} onChangeText={setBankName} />
              <EditField
                label="Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                keyboardType="number-pad"
              />
              <EditField label="IFSC Code" value={ifsc} onChangeText={setIfsc} />
              <EditField label="PAN Number" value={pan} onChangeText={setPan} />
              <View style={styles.actionRow}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  size="compact"
                  onPress={() => setBankEdit(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label={saving ? 'Saving…' : 'Save Bank Details'}
                  size="compact"
                  onPress={() => void saveBank()}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </SurfaceCard>
        ) : (
          <View style={styles.tabBody}>
            <View style={styles.editBtnRow}>
              <PrimaryButton
                label="Edit Bank Details"
                icon="create-outline"
                size="compact"
                onPress={() => {
                  setBankName(profile.bankName || '');
                  setBankAccount(profile.bankAccount || '');
                  setIfsc(profile.ifscCode || '');
                  setPan(profile.panNumber || '');
                  setBankEdit(true);
                }}
              />
            </View>
            <SurfaceCard padded={false}>
              <ReadRow icon="business-outline" label="Bank Name" value={dash(profile.bankName)} />
              <ReadRow
                icon="card-outline"
                label="Account Number"
                value={dash(profile.bankAccount)}
              />
              <ReadRow icon="key-outline" label="IFSC Code" value={dash(profile.ifscCode)} />
              <ReadRow
                icon="document-text-outline"
                label="PAN Number"
                value={dash(profile.panNumber)}
              />
              <ReadRow
                icon="cash-outline"
                label="Basic Salary"
                value={
                  profile.basicSalary != null
                    ? `₹${profile.basicSalary.toLocaleString('en-IN')}`
                    : '—'
                }
                last
              />
            </SurfaceCard>
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerName: { fontSize: 18, fontWeight: '800' },
  tabBody: { gap: 12 },
  editBtnRow: { flexDirection: 'row', justifyContent: 'flex-end' },
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
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dayRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
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
  assignHead: {
    fontWeight: '800',
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  leaveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leaveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
