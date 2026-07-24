/** My Profile — live staff self-service (web StaffSelfServiceTab). */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  HeroCard,
  SurfaceCard,
  SectionHeader,
  Avatar,
  Badge,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherStaffProfile } from '../../../hooks/useTeacherStaffProfile';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';

export default function MyProfileScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { profile, status, error, saving, updateProfile } = useTeacherStaffProfile();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);

  useEffect(() => {
    setPhone(profile.phone === '—' ? '' : profile.phone);
    setEmail(profile.email === '—' ? '' : profile.email);
  }, [profile.phone, profile.email]);

  const contact = [
    { key: 'email', icon: 'mail-outline' as const, label: 'Email', value: profile.email },
    { key: 'phone', icon: 'call-outline' as const, label: 'Phone', value: profile.phone },
    { key: 'id', icon: 'id-card-outline' as const, label: 'Employee ID', value: profile.employeeId },
    { key: 'joined', icon: 'calendar-outline' as const, label: 'Joined', value: profile.joinedOn },
  ];

  const onSave = async () => {
    const ok = await updateProfile({
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
    });
    if (!ok) {
      Alert.alert('Update failed', error || 'Could not update profile');
      return;
    }
    setEditing(false);
    Alert.alert('Saved', 'Profile updated.');
  };

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title="My Profile"
          trailingIcon={editing ? undefined : 'create-outline'}
          onTrailingPress={() => setEditing(true)}
        />
      }
      contentStyle={styles.content}
      footer={
        editing ? (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                setEditing(false);
                setPhone(profile.phone === '—' ? '' : profile.phone);
                setEmail(profile.email === '—' ? '' : profile.email);
              }}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              onPress={() => void onSave()}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={styles.footerRow}>
            <PrimaryButton
              label="Edit Profile"
              icon="create-outline"
              variant="outline"
              onPress={() => setEditing(true)}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Apply Leave"
              icon="calendar-outline"
              onPress={() => navigation.navigate('ApplyLeave', {})}
              style={{ flex: 1 }}
            />
          </View>
        )
      }
    >
      {status === 'loading' ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 8 }} />
      ) : null}

      <HeroCard>
        <View style={styles.heroRow}>
          <Avatar name={profile.name} uri={profile.avatarUrl} size={64} />
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{profile.name}</Text>
            <Text style={styles.heroRole}>
              {profile.designation || profile.role}
              {profile.department ? ` · ${profile.department}` : ''}
            </Text>
            <View style={styles.idBadge}>
              <Text style={styles.idText}>{profile.employeeId}</Text>
            </View>
          </View>
        </View>
      </HeroCard>

      <View style={styles.section}>
        <SectionHeader title="Contact Information" />
        <SurfaceCard padded={false} style={styles.card}>
          {editing ? (
            <View style={styles.form}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  {
                    color: theme.colors.textPrimary,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  },
                ]}
              />
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
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
          ) : (
            contact.map((item, index) => (
              <View
                key={item.key}
                style={[
                  styles.row,
                  index < contact.length - 1 && {
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: theme.colors.tintTeal }]}>
                  <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.rowValue, { color: theme.colors.textPrimary }]}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))
          )}
        </SurfaceCard>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Subjects Teaching" />
        <SurfaceCard>
          <View style={styles.chips}>
            {profile.subjects.length > 0 ? (
              profile.subjects.map((subject) => (
                <Badge key={subject} label={subject} accent="blue" icon="book" />
              ))
            ) : (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                No subjects listed on your staff profile.
              </Text>
            )}
          </View>
        </SurfaceCard>
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  heroRole: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  idBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  idText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  section: { gap: 0 },
  card: { paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 11 },
  rowValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  form: { paddingVertical: 8, gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
});
