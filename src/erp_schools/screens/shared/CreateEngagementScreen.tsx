/**
 * Create / Edit Engagement record — forms per web StudentEngagementTab modals.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  PrimaryButton,
  ScreenLoader,
} from '../../components';
import { useTeacherTheme } from '../../theme/useTeacherTheme';
import { useEngagementData } from '../../hooks/useEngagementData';
import {
  COUNCIL_TYPES,
  MEMBER_ROLES,
  GRIEVANCE_TYPES,
  GRIEVANCE_PRIORITIES,
  GRIEVANCE_STATUSES,
  EVENT_TYPES,
  EVENT_STATUSES,
  GALLERY_CATEGORIES,
  MEDIA_TYPES,
  enumLabel,
  type EngagementTabKey,
} from '../../utils/engagementMeta';
import { toLocalDateStr } from '../../utils/apiHelpers';

type Params = {
  CreateEngagement: { kind: EngagementTabKey; recordId?: number };
};
type Nav = NativeStackNavigationProp<Params>;

const opts = (values: readonly string[]) =>
  values.map((v) => ({ label: enumLabel(v), value: v }));

function titleFor(kind: EngagementTabKey, isEdit: boolean): string {
  const verb = isEdit ? 'Edit' : 'Add';
  switch (kind) {
    case 'councils':
      return `${verb} Council`;
    case 'members':
      return `${verb} Member`;
    case 'grievances':
      return `${verb} Grievance`;
    case 'events':
      return `${verb} Event`;
    case 'registrations':
      return isEdit ? 'Edit Registration' : 'New Registration';
    case 'gallery':
      return `${verb} Gallery Item`;
    default:
      return verb;
  }
}

export default function CreateEngagementScreen() {
  const theme = useTeacherTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<Params, 'CreateEngagement'>>();
  const kind = route.params?.kind || 'councils';
  const editingId = route.params?.recordId;
  const isEdit = editingId != null && editingId > 0;

  const eng = useEngagementData(kind);
  const [loading, setLoading] = useState(Boolean(isEdit));
  const [form, setForm] = useState<Record<string, string | boolean | number>>({});

  useEffect(() => {
    if (!isEdit || !editingId) {
      // defaults matching web openCreate
      if (kind === 'councils') {
        setForm({ name: '', council_type: 'general', status: 'active' });
      } else if (kind === 'members') {
        setForm({
          council_id: '',
          student_id: '',
          role: 'member',
          status: 'active',
          joined_date: toLocalDateStr(),
        });
      } else if (kind === 'grievances') {
        setForm({
          student_id: '',
          subject: '',
          description: '',
          grievance_type: 'general',
          priority: 'medium',
          status: 'submitted',
        });
      } else if (kind === 'events') {
        setForm({
          title: '',
          event_type: 'general',
          start_date: toLocalDateStr(),
          end_date: '',
          venue: '',
          description: '',
          max_participants: '',
          status: 'upcoming',
        });
      } else if (kind === 'registrations') {
        setForm({
          event_id: '',
          student_id: '',
          attendance_marked: false,
          remarks: '',
        });
      } else {
        setForm({
          title: '',
          category: 'general',
          media_url: '',
          media_type: 'image',
          description: '',
          is_featured: false,
        });
      }
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const raw = await eng.getRecord(editingId);
      if (cancelled) return;
      if (raw) {
        const next: Record<string, string | boolean | number> = {};
        Object.entries(raw).forEach(([k, v]) => {
          if (v == null) next[k] = '';
          else if (typeof v === 'boolean' || typeof v === 'number') next[k] = v;
          else next[k] = String(v);
        });
        setForm(next);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId, kind]);

  const set = (key: string, value: string | boolean | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSave = async () => {
    if (kind === 'councils' && !String(form.name || '').trim()) {
      Alert.alert('Required', 'Name is required.');
      return;
    }
    if (kind === 'members' && (!form.council_id || !form.student_id)) {
      Alert.alert('Required', 'Council ID and Student ID are required.');
      return;
    }
    if (
      kind === 'grievances' &&
      (!String(form.subject || '').trim() || !String(form.description || '').trim())
    ) {
      Alert.alert('Required', 'Subject and description are required.');
      return;
    }
    if (kind === 'events' && (!String(form.title || '').trim() || !form.start_date)) {
      Alert.alert('Required', 'Title and start date are required.');
      return;
    }
    if (kind === 'registrations' && (!form.event_id || !form.student_id)) {
      Alert.alert('Required', 'Event ID and Student ID are required.');
      return;
    }
    if (
      kind === 'gallery' &&
      (!String(form.title || '').trim() || !String(form.media_url || '').trim())
    ) {
      Alert.alert('Required', 'Title and media URL are required.');
      return;
    }

    const payload: Record<string, unknown> = { ...form };
    // normalize ids / numbers
    ['council_id', 'student_id', 'event_id', 'advisor_id', 'max_participants'].forEach(
      (k) => {
        if (payload[k] === '' || payload[k] == null) {
          if (k === 'max_participants' || k === 'advisor_id') delete payload[k];
          else payload[k] = undefined;
        } else if (typeof payload[k] === 'string') {
          payload[k] = Number(payload[k]);
        }
      },
    );
    if (kind === 'registrations') {
      payload.attendance_marked = Boolean(form.attendance_marked);
    }
    if (kind === 'gallery') {
      payload.is_featured = Boolean(form.is_featured);
    }

    const ok = await eng.saveRecord(payload, isEdit ? editingId : undefined);
    if (!ok) {
      Alert.alert('Save failed', eng.error || 'Could not save.');
      return;
    }
    navigation.goBack();
  };

  const fields = useMemo(() => {
    if (kind === 'councils') {
      return (
        <>
          <FormField label="Name" required>
            <TextField
              value={String(form.name || '')}
              onChangeText={(t) => set('name', t)}
              placeholder="Council name"
            />
          </FormField>
          <FormField label="Type">
            <SelectField
              options={opts(COUNCIL_TYPES)}
              value={String(form.council_type || 'general')}
              onChange={(v) => set('council_type', v)}
            />
          </FormField>
          <FormField label="Academic Year">
            <TextField
              value={String(form.academic_year || '')}
              onChangeText={(t) => set('academic_year', t)}
              placeholder="e.g. 2026-27"
            />
          </FormField>
          <FormField label="Formed Date">
            <TextField
              value={String(form.formed_date || '').slice(0, 10)}
              onChangeText={(t) => set('formed_date', t)}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Advisor ID">
            <TextField
              value={String(form.advisor_id || '')}
              onChangeText={(t) => set('advisor_id', t)}
              keyboardType="number-pad"
              placeholder="Optional staff id"
            />
          </FormField>
          <FormField label="Description">
            <TextField
              value={String(form.description || '')}
              onChangeText={(t) => set('description', t)}
              multiline
              placeholder="Optional…"
            />
          </FormField>
        </>
      );
    }
    if (kind === 'members') {
      return (
        <>
          <FormField label="Council ID" required>
            <TextField
              value={String(form.council_id || '')}
              onChangeText={(t) => set('council_id', t)}
              keyboardType="number-pad"
            />
          </FormField>
          <FormField label="Student ID" required>
            <TextField
              value={String(form.student_id || '')}
              onChangeText={(t) => set('student_id', t)}
              keyboardType="number-pad"
            />
          </FormField>
          <FormField label="Role">
            <SelectField
              options={opts(MEMBER_ROLES)}
              value={String(form.role || 'member')}
              onChange={(v) => set('role', v)}
            />
          </FormField>
          <FormField label="Joined Date">
            <TextField
              value={String(form.joined_date || '').slice(0, 10)}
              onChangeText={(t) => set('joined_date', t)}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
        </>
      );
    }
    if (kind === 'grievances') {
      return (
        <>
          <FormField label="Student ID">
            <TextField
              value={String(form.student_id || '')}
              onChangeText={(t) => set('student_id', t)}
              keyboardType="number-pad"
            />
          </FormField>
          <FormField label="Subject" required>
            <TextField
              value={String(form.subject || '')}
              onChangeText={(t) => set('subject', t)}
            />
          </FormField>
          <FormField label="Description" required>
            <TextField
              value={String(form.description || '')}
              onChangeText={(t) => set('description', t)}
              multiline
            />
          </FormField>
          <FormField label="Type">
            <SelectField
              options={opts(GRIEVANCE_TYPES)}
              value={String(form.grievance_type || 'general')}
              onChange={(v) => set('grievance_type', v)}
            />
          </FormField>
          <FormField label="Priority">
            <SelectField
              options={opts(GRIEVANCE_PRIORITIES)}
              value={String(form.priority || 'medium')}
              onChange={(v) => set('priority', v)}
            />
          </FormField>
          <FormField label="Status">
            <SelectField
              options={opts(GRIEVANCE_STATUSES)}
              value={String(form.status || 'submitted')}
              onChange={(v) => set('status', v)}
            />
          </FormField>
          {isEdit ? (
            <FormField label="Resolution Note">
              <TextField
                value={String(form.resolution_note || '')}
                onChangeText={(t) => set('resolution_note', t)}
                multiline
              />
            </FormField>
          ) : null}
        </>
      );
    }
    if (kind === 'events') {
      return (
        <>
          <FormField label="Title" required>
            <TextField
              value={String(form.title || '')}
              onChangeText={(t) => set('title', t)}
            />
          </FormField>
          <FormField label="Type">
            <SelectField
              options={opts(EVENT_TYPES)}
              value={String(form.event_type || 'general')}
              onChange={(v) => set('event_type', v)}
            />
          </FormField>
          <FormField label="Start Date" required>
            <TextField
              value={String(form.start_date || '').slice(0, 10)}
              onChangeText={(t) => set('start_date', t)}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="End Date">
            <TextField
              value={String(form.end_date || '').slice(0, 10)}
              onChangeText={(t) => set('end_date', t)}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Venue">
            <TextField
              value={String(form.venue || '')}
              onChangeText={(t) => set('venue', t)}
            />
          </FormField>
          <FormField label="Max Participants">
            <TextField
              value={String(form.max_participants || '')}
              onChangeText={(t) => set('max_participants', t)}
              keyboardType="number-pad"
            />
          </FormField>
          <FormField label="Status">
            <SelectField
              options={opts(EVENT_STATUSES)}
              value={String(form.status || 'upcoming')}
              onChange={(v) => set('status', v)}
            />
          </FormField>
          <FormField label="Description">
            <TextField
              value={String(form.description || '')}
              onChangeText={(t) => set('description', t)}
              multiline
            />
          </FormField>
        </>
      );
    }
    if (kind === 'registrations') {
      return (
        <>
          <FormField label="Event ID" required>
            <TextField
              value={String(form.event_id || '')}
              onChangeText={(t) => set('event_id', t)}
              keyboardType="number-pad"
              editable={!isEdit}
            />
          </FormField>
          <FormField label="Student ID" required>
            <TextField
              value={String(form.student_id || '')}
              onChangeText={(t) => set('student_id', t)}
              keyboardType="number-pad"
              editable={!isEdit}
            />
          </FormField>
          <FormField label="Attendance Marked">
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                Marked present
              </Text>
              <Switch
                value={Boolean(form.attendance_marked)}
                onValueChange={(v) => set('attendance_marked', v)}
              />
            </View>
          </FormField>
          <FormField label="Remarks">
            <TextField
              value={String(form.remarks || '')}
              onChangeText={(t) => set('remarks', t)}
              multiline
            />
          </FormField>
        </>
      );
    }
    return (
      <>
        <FormField label="Title" required>
          <TextField
            value={String(form.title || '')}
            onChangeText={(t) => set('title', t)}
          />
        </FormField>
        <FormField label="Category">
          <SelectField
            options={opts(GALLERY_CATEGORIES)}
            value={String(form.category || 'general')}
            onChange={(v) => set('category', v)}
          />
        </FormField>
        <FormField label="Media Type">
          <SelectField
            options={opts(MEDIA_TYPES)}
            value={String(form.media_type || 'image')}
            onChange={(v) => set('media_type', v)}
          />
        </FormField>
        <FormField label="Media URL" required>
          <TextField
            value={String(form.media_url || '')}
            onChangeText={(t) => set('media_url', t)}
            placeholder="https://…"
          />
        </FormField>
        <FormField label="Featured">
          <View style={styles.switchRow}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
              Show as featured
            </Text>
            <Switch
              value={Boolean(form.is_featured)}
              onValueChange={(v) => set('is_featured', v)}
            />
          </View>
        </FormField>
        <FormField label="Description">
          <TextField
            value={String(form.description || '')}
            onChangeText={(t) => set('description', t)}
            multiline
          />
        </FormField>
      </>
    );
  }, [kind, form, isEdit, theme.colors.textSecondary]);

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={titleFor(kind, isEdit)} />}>
        <ScreenLoader message="Loading…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={titleFor(kind, isEdit)} />}
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
            label={eng.saving ? 'Saving…' : 'Save'}
            icon="checkmark-outline"
            disabled={eng.saving}
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>{fields}</View>
      </SurfaceCard>
      <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
        IDs match the web admin forms (council / student / event numeric IDs).
      </Text>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  form: { gap: 4 },
  footerRow: { flexDirection: 'row', gap: 10 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
