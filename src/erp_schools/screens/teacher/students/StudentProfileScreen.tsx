/**
 * Student Profile — web StudentsTab detail modal parity.
 * Tabs: Profile | Guardians | Medical | Documents
 * Header Edit → Edit Student Profile (admission, APAAR, DOB, gender, blood, city)
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
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
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
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import {
  STUDENT_DOCUMENT_TYPES,
  useTeacherStudentActions,
} from '../../../hooks/useTeacherStudentActions';
import type { TeacherStackParamList } from '../../../types/navigation';
import { pickString } from '../../../utils/apiHelpers';
import {
  apaarDigitsOnly,
  formatApaarId,
  isValidApaarId,
} from '../../../utils/apaarId';

type DetailTab = 'profile' | 'guardians' | 'medical' | 'documents';

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'guardians', label: 'Guardians' },
  { key: 'medical', label: 'Medical' },
  { key: 'documents', label: 'Documents' },
];

const GENDERS = ['Male', 'Female', 'Other'] as const;

export default function StudentProfileScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'StudentProfile'>>();
  const navigation = useTeacherNavigation();
  const { getStudentById, refetch, status: rosterStatus } = useTeacherData();
  const {
    saving,
    error,
    saveProfile,
    loadDetail,
    addGuardian,
    upsertMedical,
    addDocument,
    uploadDocumentFile,
  } = useTeacherStudentActions();

  const student = getStudentById(route.params?.studentId);
  const profileId = student?.profileId ?? null;
  const rosterLoading = rosterStatus === 'idle' || rosterStatus === 'loading';

  const [tab, setTab] = useState<DetailTab>('profile');
  const [detailLoading, setDetailLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown>>({});
  const [guardians, setGuardians] = useState<Record<string, unknown>[]>([]);
  const [medical, setMedical] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);

  // Edit Student Profile (web modal)
  const [editingProfile, setEditingProfile] = useState(!!route.params?.openEdit);
  const [admission, setAdmission] = useState('');
  const [apaarId, setApaarId] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');

  // Guardian form
  const [showGuardianForm, setShowGuardianForm] = useState(false);
  const [gName, setGName] = useState('');
  const [gRelation, setGRelation] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gPrimary, setGPrimary] = useState(false);

  // Medical form
  const [showMedicalForm, setShowMedicalForm] = useState(false);
  const [mBlood, setMBlood] = useState('');
  const [mAllergies, setMAllergies] = useState('');
  const [mConditions, setMConditions] = useState('');
  const [mEmergencyName, setMEmergencyName] = useState('');
  const [mEmergencyPhone, setMEmergencyPhone] = useState('');

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [dType, setDType] = useState('');
  const [dName, setDName] = useState('');
  const [dUrl, setDUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const hydrateEditForm = useCallback(
    (p: Record<string, unknown>) => {
      setAdmission(
        pickString(p.admission_number, student?.admissionNumber, student?.rollNo),
      );
      setApaarId(apaarDigitsOnly(pickString(p.apaar_id, student?.apaarId)));
      setDob(pickString(p.date_of_birth, student?.dateOfBirth));
      setGender(pickString(p.gender, student?.gender));
      setBloodGroup(pickString(p.blood_group, student?.bloodGroup));
      setCity(pickString(p.city, student?.city));
    },
    [student],
  );

  const refreshDetail = useCallback(async () => {
    if (!profileId) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    const detail = await loadDetail(profileId);
    if (detail) {
      setProfile(detail.profile);
      setGuardians(detail.guardians);
      setMedical(detail.medical);
      setDocuments(detail.documents);
      hydrateEditForm(detail.profile);
    }
    setDetailLoading(false);
  }, [profileId, loadDetail, hydrateEditForm]);

  useEffect(() => {
    void refreshDetail();
  }, [refreshDetail]);

  useEffect(() => {
    if (!profileId && student) {
      hydrateEditForm({});
      setDetailLoading(false);
    }
  }, [profileId, student, hydrateEditForm]);

  const headerMeta = useMemo(() => {
    const adm = pickString(profile.admission_number, student?.admissionNumber, student?.rollNo);
    const g = pickString(profile.gender, student?.gender);
    const d = pickString(profile.date_of_birth, student?.dateOfBirth);
    const parts = [adm, g, d ? `DOB: ${d}` : ''].filter(Boolean);
    return parts.join(' · ');
  }, [profile, student]);

  if (rosterLoading && !student) {
    return (
      <TeacherScreen header={<ScreenHeader title="Student Profile" />}>
        <ScreenLoader message="Loading student…" />
      </TeacherScreen>
    );
  }

  if (!student) {
    return (
      <TeacherScreen header={<ScreenHeader title="Student Profile" />}>
        <EmptyState
          icon="person-outline"
          title="Student not found"
          message="Go back and pick a student from Class Overview."
        />
      </TeacherScreen>
    );
  }

  const onSaveProfile = async () => {
    if (apaarId && !isValidApaarId(apaarId)) {
      Alert.alert('Invalid APAAR ID', 'APAAR ID must be exactly 12 digits (XXXX-XXXX-XXXX)');
      return;
    }
    const ok = await saveProfile({
      profileId,
      form: {
        user_id: student.userId ?? undefined,
        admission_number: admission || undefined,
        apaar_id: apaarId || undefined,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        blood_group: bloodGroup || undefined,
        city: city || undefined,
      },
    });
    if (!ok) {
      Alert.alert('Save failed', error || 'Could not save student profile');
      return;
    }
    setEditingProfile(false);
    void refetch();
    await refreshDetail();
    Alert.alert('Saved', 'Student profile updated.');
  };

  const onSaveGuardian = async () => {
    if (!profileId) {
      Alert.alert('No profile', 'Create / save the student profile first.');
      return;
    }
    if (!gName.trim()) {
      Alert.alert('Name required', 'Guardian name is required.');
      return;
    }
    const ok = await addGuardian(profileId, {
      name: gName.trim(),
      relation: gRelation.trim() || undefined,
      phone: gPhone.trim() || undefined,
      email: gEmail.trim() || undefined,
      is_primary: gPrimary,
    });
    if (!ok) {
      Alert.alert('Failed', error || 'Could not add guardian');
      return;
    }
    setShowGuardianForm(false);
    setGName('');
    setGRelation('');
    setGPhone('');
    setGEmail('');
    setGPrimary(false);
    await refreshDetail();
  };

  const openMedicalForm = (existing: Record<string, unknown> | null) => {
    setMBlood(pickString(existing?.blood_group));
    setMAllergies(pickString(existing?.allergies));
    setMConditions(pickString(existing?.medical_conditions));
    setMEmergencyName(pickString(existing?.emergency_contact_name));
    setMEmergencyPhone(pickString(existing?.emergency_contact_phone));
    setShowMedicalForm(true);
  };

  const onSaveMedical = async () => {
    if (!profileId) {
      Alert.alert('No profile', 'Create / save the student profile first.');
      return;
    }
    const ok = await upsertMedical(profileId, {
      blood_group: mBlood || undefined,
      allergies: mAllergies || undefined,
      medical_conditions: mConditions || undefined,
      emergency_contact_name: mEmergencyName || undefined,
      emergency_contact_phone: mEmergencyPhone || undefined,
    });
    if (!ok) {
      Alert.alert('Failed', error || 'Could not save medical info');
      return;
    }
    setShowMedicalForm(false);
    await refreshDetail();
  };

  const pickDocFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const uploaded = await uploadDocumentFile({
        uri: asset.uri,
        name: asset.name || 'document',
        mimeType: asset.mimeType,
      });
      setUploading(false);
      if (!uploaded) {
        Alert.alert('Upload failed', error || 'Could not upload file');
        return;
      }
      setDUrl(uploaded.url);
      if (!dName) setDName(uploaded.filename);
    } catch {
      setUploading(false);
      Alert.alert('Upload failed', 'Could not pick or upload file');
    }
  };

  const onSaveDocument = async () => {
    if (!profileId) {
      Alert.alert('No profile', 'Create / save the student profile first.');
      return;
    }
    if (!dType || !dUrl.trim()) {
      Alert.alert('Required', 'Document type and file/URL are required.');
      return;
    }
    const ok = await addDocument(profileId, {
      document_type: dType,
      document_name: dName.trim() || undefined,
      file_url: dUrl.trim(),
    });
    if (!ok) {
      Alert.alert('Failed', error || 'Could not add document');
      return;
    }
    setShowDocForm(false);
    setDType('');
    setDName('');
    setDUrl('');
    await refreshDetail();
  };

  const openUrl = (url?: string) => {
    if (!url) return;
    void Linking.openURL(url).catch(() =>
      Alert.alert('Unable to open', 'Could not open this document link.'),
    );
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="Student Profile"
          trailingIcon={editingProfile ? undefined : 'create-outline'}
          onTrailingPress={() => {
            hydrateEditForm(profile);
            setEditingProfile(true);
          }}
        />
      }
      contentStyle={styles.content}
      footer={
        editingProfile ? (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                setEditingProfile(false);
                hydrateEditForm(profile);
              }}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              icon="checkmark-outline"
              onPress={() => void onSaveProfile()}
              style={{ flex: 1 }}
            />
          </View>
        ) : undefined
      }
    >
      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={student.name} uri={student.avatarUrl} size={64} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{student.name}</Text>
            <Text style={styles.heroMeta}>{headerMeta || student.classCode}</Text>
            {(student.className || student.sectionName) && (
              <Text style={styles.heroMeta}>
                {student.className || student.classCode}
                {student.sectionName ? ` ${student.sectionName}` : ''}
                {student.subjectName ? ` · ${student.subjectName}` : ''}
              </Text>
            )}
          </View>
        </View>
      </HeroCard>

      {detailLoading ? (
        <ScreenLoader message="Loading profile details…" fill={false} />
      ) : editingProfile ? (
        <SurfaceCard>
          <SectionHeader title="Edit Student Profile" />
          <View style={styles.form}>
            <Field label="Admission Number" value={admission} onChangeText={setAdmission} />
            <Field
              label="APAAR ID"
              value={formatApaarId(apaarId)}
              onChangeText={(t) => setApaarId(apaarDigitsOnly(t))}
              placeholder="XXXX-XXXX-XXXX"
              keyboardType="number-pad"
              maxLength={14}
            />
            <Field
              label="Date of Birth"
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
            />
            <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => {
                const active = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active ? theme.colors.primary : theme.colors.background,
                      },
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : theme.colors.textPrimary,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Field
              label="Blood Group"
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="e.g. O+"
            />
            <Field label="City" value={city} onChangeText={setCity} />
          </View>
        </SurfaceCard>
      ) : (
        <>
          <IconTabs
            tabs={TABS}
            activeKey={tab}
            onChange={(k) => setTab(k as DetailTab)}
            scrollable={false}
          />

          {tab === 'profile' && (
            <SurfaceCard>
              <View style={styles.readList}>
                <ReadRow
                  label="APAAR ID"
                  value={
                    pickString(profile.apaar_id)
                      ? formatApaarId(pickString(profile.apaar_id))
                      : '—'
                  }
                />
                <ReadRow label="Blood Group" value={pickString(profile.blood_group) || '—'} />
                <ReadRow label="Nationality" value={pickString(profile.nationality) || '—'} />
                <ReadRow label="City" value={pickString(profile.city) || '—'} />
                <ReadRow label="State" value={pickString(profile.state) || '—'} />
                <ReadRow label="Address" value={pickString(profile.address_line1) || '—'} />
                <ReadRow label="Pincode" value={pickString(profile.pincode) || '—'} />
                <ReadRow
                  label="Previous School"
                  value={pickString(profile.previous_school) || '—'}
                />
                <ReadRow label="TC Number" value={pickString(profile.tc_number) || '—'} />
                <ReadRow
                  label="Admission Date"
                  value={pickString(profile.admission_date) || '—'}
                />
                <ReadRow
                  label="Active"
                  value={
                    profile.is_active === false || profile.is_active === 'false' ? 'No' : 'Yes'
                  }
                />
              </View>
            </SurfaceCard>
          )}

          {tab === 'guardians' && (
            <View style={styles.tabBody}>
              <PrimaryButton
                label="Add Guardian"
                icon="add"
                size="compact"
                onPress={() => setShowGuardianForm(true)}
              />
              {guardians.length === 0 ? (
                <SurfaceCard>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                    No guardians on record.
                  </Text>
                </SurfaceCard>
              ) : (
                <SurfaceCard padded={false}>
                  {guardians.map((g, i) => (
                    <View
                      key={pickString(g.id, `g-${i}`)}
                      style={[
                        styles.docRow,
                        i < guardians.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docTitle, { color: theme.colors.textPrimary }]}>
                          {pickString(g.name, 'Guardian')}
                          {g.is_primary ? ' · Primary' : ''}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {pickString(g.relation) || '—'}
                          {pickString(g.phone) ? ` · ${pickString(g.phone)}` : ''}
                          {pickString(g.email) ? ` · ${pickString(g.email)}` : ''}
                        </Text>
                      </View>
                    </View>
                  ))}
                </SurfaceCard>
              )}
              {showGuardianForm ? (
                <SurfaceCard>
                  <SectionHeader title="Add Guardian" />
                  <View style={styles.form}>
                    <Field label="Name *" value={gName} onChangeText={setGName} />
                    <Field
                      label="Relation"
                      value={gRelation}
                      onChangeText={setGRelation}
                      placeholder="e.g. Father"
                    />
                    <Field
                      label="Phone"
                      value={gPhone}
                      onChangeText={setGPhone}
                      keyboardType="phone-pad"
                    />
                    <Field
                      label="Email"
                      value={gEmail}
                      onChangeText={setGEmail}
                      keyboardType="email-address"
                    />
                    <View style={styles.switchRow}>
                      <Text style={{ color: theme.colors.textPrimary, fontSize: 14 }}>
                        Primary
                      </Text>
                      <Switch value={gPrimary} onValueChange={setGPrimary} />
                    </View>
                    <View style={styles.footerRow}>
                      <PrimaryButton
                        label="Cancel"
                        variant="outline"
                        onPress={() => setShowGuardianForm(false)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label={saving ? 'Saving…' : 'Save'}
                        onPress={() => void onSaveGuardian()}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                </SurfaceCard>
              ) : null}
            </View>
          )}

          {tab === 'medical' && (
            <View style={styles.tabBody}>
              {medical ? (
                <SurfaceCard>
                  <View style={styles.readList}>
                    <ReadRow label="Blood Group" value={pickString(medical.blood_group) || '—'} />
                    <ReadRow label="Allergies" value={pickString(medical.allergies) || '—'} />
                    <ReadRow
                      label="Conditions"
                      value={pickString(medical.medical_conditions) || '—'}
                    />
                    <ReadRow label="Medications" value={pickString(medical.medications) || '—'} />
                    <ReadRow
                      label="Emergency Contact"
                      value={
                        [
                          pickString(medical.emergency_contact_name),
                          pickString(medical.emergency_contact_phone),
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'
                      }
                    />
                    <ReadRow
                      label="Doctor"
                      value={
                        [pickString(medical.doctor_name), pickString(medical.doctor_phone)]
                          .filter(Boolean)
                          .join(' · ') || '—'
                      }
                    />
                  </View>
                  <PrimaryButton
                    label="Edit Medical"
                    variant="outline"
                    onPress={() => openMedicalForm(medical)}
                    style={{ marginTop: 12 }}
                  />
                </SurfaceCard>
              ) : (
                <SurfaceCard>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                    No medical info on record.
                  </Text>
                  <PrimaryButton
                    label="Add"
                    icon="add"
                    size="compact"
                    onPress={() => openMedicalForm(null)}
                    style={{ marginTop: 12 }}
                  />
                </SurfaceCard>
              )}
              {showMedicalForm ? (
                <SurfaceCard>
                  <SectionHeader title={medical ? 'Edit Medical' : 'Add Medical'} />
                  <View style={styles.form}>
                    <Field label="Blood Group" value={mBlood} onChangeText={setMBlood} />
                    <Field label="Allergies" value={mAllergies} onChangeText={setMAllergies} />
                    <Field
                      label="Medical Conditions"
                      value={mConditions}
                      onChangeText={setMConditions}
                    />
                    <Field
                      label="Emergency Contact Name"
                      value={mEmergencyName}
                      onChangeText={setMEmergencyName}
                    />
                    <Field
                      label="Emergency Contact Phone"
                      value={mEmergencyPhone}
                      onChangeText={setMEmergencyPhone}
                      keyboardType="phone-pad"
                    />
                    <View style={styles.footerRow}>
                      <PrimaryButton
                        label="Cancel"
                        variant="outline"
                        onPress={() => setShowMedicalForm(false)}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label={saving ? 'Saving…' : 'Save'}
                        onPress={() => void onSaveMedical()}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                </SurfaceCard>
              ) : null}
            </View>
          )}

          {tab === 'documents' && (
            <View style={styles.tabBody}>
              <PrimaryButton
                label="Add Document"
                icon="add"
                size="compact"
                onPress={() => setShowDocForm(true)}
              />
              {documents.length === 0 ? (
                <SurfaceCard>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>
                    No documents uploaded.
                  </Text>
                </SurfaceCard>
              ) : (
                <SurfaceCard padded={false}>
                  {documents.map((d, i) => {
                    const url = pickString(d.file_url);
                    const typeLabel =
                      STUDENT_DOCUMENT_TYPES.find((t) => t.value === d.document_type)?.label ||
                      pickString(d.document_type, 'Document');
                    return (
                      <TouchableOpacity
                        key={pickString(d.id, `d-${i}`)}
                        style={[
                          styles.docRow,
                          i < documents.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => openUrl(url)}
                        disabled={!url}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.docTitle, { color: theme.colors.textPrimary }]}>
                            {typeLabel}
                          </Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                            {pickString(d.document_name) || '—'}
                            {' · '}
                            {d.verified ? 'Verified' : 'Pending'}
                          </Text>
                        </View>
                        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                          View
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </SurfaceCard>
              )}
              {showDocForm ? (
                <SurfaceCard>
                  <SectionHeader title="Add Document" />
                  <View style={styles.form}>
                    <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                      Document Type *
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.chipRow}>
                        {STUDENT_DOCUMENT_TYPES.map((t) => {
                          const active = dType === t.value;
                          return (
                            <TouchableOpacity
                              key={t.value}
                              style={[
                                styles.chip,
                                {
                                  borderColor: active
                                    ? theme.colors.primary
                                    : theme.colors.border,
                                  backgroundColor: active
                                    ? theme.colors.primary
                                    : theme.colors.background,
                                },
                              ]}
                              onPress={() => setDType(t.value)}
                            >
                              <Text
                                style={{
                                  color: active ? '#fff' : theme.colors.textPrimary,
                                  fontSize: 12,
                                  fontWeight: '600',
                                }}
                              >
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                    <Field label="Document Name" value={dName} onChangeText={setDName} />
                    <PrimaryButton
                      label={uploading ? 'Uploading…' : 'Choose file'}
                      variant="outline"
                      onPress={() => void pickDocFile()}
                    />
                    {dUrl && !uploading ? (
                      <Text style={{ color: '#15803d', fontSize: 12 }}>File ready</Text>
                    ) : null}
                    <Field
                      label="Or enter URL directly"
                      value={dUrl}
                      onChangeText={setDUrl}
                      placeholder="https://..."
                      autoCapitalize="none"
                    />
                    <View style={styles.footerRow}>
                      <PrimaryButton
                        label="Cancel"
                        variant="outline"
                        onPress={() => {
                          setShowDocForm(false);
                          setDType('');
                          setDName('');
                          setDUrl('');
                        }}
                        style={{ flex: 1 }}
                      />
                      <PrimaryButton
                        label={saving || uploading ? 'Saving…' : 'Save'}
                        onPress={() => void onSaveDocument()}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                </SurfaceCard>
              ) : null}
            </View>
          )}

          <View style={styles.section}>
            <SectionHeader title="Quick Links" />
            <SurfaceCard padded={false} style={styles.card}>
              <LinkRow
                icon="calendar-outline"
                label="Attendance History"
                onPress={() =>
                  navigation.navigate('StudentAttendance', { studentId: student.id })
                }
              />
              <LinkRow
                icon="trending-up-outline"
                label="Progress Analytics"
                onPress={() => navigation.navigate('StudentProgressAnalytics')}
                divider={false}
              />
            </SurfaceCard>
          </View>
        </>
      )}
    </TeacherScreen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address';
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words';
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
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
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

function ReadRow({ label, value }: { label: string; value: string }) {
  const theme = useTeacherTheme();
  return (
    <View style={styles.readRow}>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>{label}</Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
          flex: 1.2,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  divider = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  divider?: boolean;
}) {
  const theme = useTeacherTheme();
  return (
    <TouchableOpacity
      style={[
        styles.linkRow,
        divider && {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.icon, { backgroundColor: theme.colors.tintTeal }]}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={[styles.linkLabel, { color: theme.colors.textPrimary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  section: { gap: 0 },
  tabBody: { gap: 12 },
  card: { paddingHorizontal: 14 },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
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
  readList: { gap: 10 },
  readRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  footerRow: { flexDirection: 'row', gap: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  docTitle: { fontSize: 14, fontWeight: '700' },
});
