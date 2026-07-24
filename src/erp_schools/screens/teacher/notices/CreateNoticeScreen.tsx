/**
 * Create / Edit Notice — web NoticesTab New/Edit Notice form parity.
 * Fields: title, content, category, publish date, expiry date, pin.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  PrimaryButton,
  ScreenLoader,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherNoticeActions } from '../../../hooks/useTeacherNoticeActions';
import { NOTICE_CATEGORIES, type NoticeCategory } from '../../../types/domain';
import type { TeacherStackParamList } from '../../../types/navigation';
import { toLocalDateStr } from '../../../utils/apiHelpers';

export default function CreateNoticeScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'CreateNotice'>>();
  const navigation = useTeacherNavigation();
  const { createNotice, updateNotice, getNotice, saving } =
    useTeacherNoticeActions();

  const editingId = route.params?.noticeId;
  const isEdit = editingId != null && editingId > 0;

  const [loading, setLoading] = useState(Boolean(isEdit));
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NoticeCategory | string>('general');
  const [publishDate, setPublishDate] = useState(toLocalDateStr());
  const [expiryDate, setExpiryDate] = useState('');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!isEdit || !editingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const n = await getNotice(editingId);
      if (cancelled) return;
      if (n) {
        setTitle(n.title);
        setContent(n.content);
        setCategory(n.category || 'general');
        setPublishDate(n.publish_date || toLocalDateStr());
        setExpiryDate(n.expiry_date || '');
        setPinned(Boolean(n.is_pinned));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, editingId, getNotice]);

  const onSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Required', 'Title and content are required.');
      return;
    }
    const payload = {
      title: title.trim(),
      content: content.trim(),
      category,
      is_pinned: pinned,
      publish_date: publishDate || undefined,
      expiry_date: expiryDate || undefined,
    };
    try {
      const ok = isEdit
        ? await updateNotice(editingId!, payload)
        : await createNotice(payload);
      if (!ok) {
        Alert.alert('Save failed', 'Could not save notice. Check required fields and try again.');
        return;
      }
      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Could not save notice.');
    }
  };

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title={isEdit ? 'Edit Notice' : 'New Notice'} />}>
        <ScreenLoader message="Loading notice…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={<ScreenHeader title={isEdit ? 'Edit Notice' : 'New Notice'} />}
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
            onPress={() => void onSave()}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Title" required>
            <TextField value={title} onChangeText={setTitle} placeholder="Notice title" />
          </FormField>
          <FormField label="Content" required>
            <TextField
              value={content}
              onChangeText={setContent}
              placeholder="Write the notice…"
              multiline
            />
          </FormField>

          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {NOTICE_CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: active
                          ? theme.colors.primary
                          : theme.colors.background,
                      },
                    ]}
                    onPress={() => setCategory(c)}
                  >
                    <Text
                      style={{
                        color: active ? '#fff' : theme.colors.textPrimary,
                        fontSize: 13,
                        fontWeight: '600',
                        textTransform: 'capitalize',
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <FormField label="Publish Date">
            <TextField
              value={publishDate}
              onChangeText={setPublishDate}
              placeholder="YYYY-MM-DD"
            />
          </FormField>
          <FormField label="Expiry Date">
            <TextField
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholder="YYYY-MM-DD (optional)"
            />
          </FormField>

          <View style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>
              Pin this notice
            </Text>
            <Switch
              value={pinned}
              onValueChange={setPinned}
              trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  form: { gap: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 10 },
});
