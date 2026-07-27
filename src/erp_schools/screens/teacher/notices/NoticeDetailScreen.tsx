/**
 * Notice Detail — web NoticesTab view modal parity (mobile screen).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  PrimaryButton,
  ScreenLoader,
  EmptyState,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherNoticeActions } from '../../../hooks/useTeacherNoticeActions';
import type { TeacherStackParamList } from '../../../types/navigation';
import type { AccentKey } from '../../../theme/accents';
import { formatDisplayDate } from '../../../utils/apiHelpers';

const CATEGORY_ACCENT: Record<string, AccentKey> = {
  general: 'blue',
  academic: 'purple',
  fee: 'orange',
  event: 'purple',
  exam: 'pink',
  holiday: 'green',
};

type NoticeDetail = {
  id: number;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  publish_date: string;
  expiry_date: string;
};

export default function NoticeDetailScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'NoticeDetail'>>();
  const navigation = useTeacherNavigation();
  const { getNotice, deactivateNotice, saving, error } = useTeacherNoticeActions();
  const noticeId = route.params?.noticeId;

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeDetail | null>(null);

  useEffect(() => {
    if (!noticeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const n = await getNotice(noticeId);
      if (!cancelled) {
        setNotice(n);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [noticeId, getNotice]);

  if (loading) {
    return (
      <TeacherScreen header={<ScreenHeader title="Notice" />}>
        <ScreenLoader message="Loading notice…" />
      </TeacherScreen>
    );
  }

  if (!notice) {
    return (
      <TeacherScreen header={<ScreenHeader title="Notice" />}>
        <EmptyState
          icon="megaphone-outline"
          title="Notice not found"
          message={error || 'This notice may have been removed.'}
        />
      </TeacherScreen>
    );
  }

  const cat = (notice.category || 'general').toLowerCase();
  const accent = CATEGORY_ACCENT[cat] || 'teal';

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title={notice.title}
          trailingIcon="create-outline"
          onTrailingPress={() =>
            navigation.navigate('CreateNotice', { noticeId: notice.id })
          }
        />
      }
      contentStyle={styles.content}
      footer={
        <View style={styles.footerRow}>
          <PrimaryButton
            label="Edit"
            variant="outline"
            icon="create-outline"
            onPress={() => navigation.navigate('CreateNotice', { noticeId: notice.id })}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label={saving ? '…' : 'Deactivate'}
            onPress={() => {
              Alert.alert('Deactivate notice?', undefined, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Deactivate',
                  style: 'destructive',
                  onPress: () => {
                    void deactivateNotice(notice.id).then((ok) => {
                      if (ok) navigation.goBack();
                      else Alert.alert('Failed', error || 'Could not deactivate.');
                    });
                  },
                },
              ]);
            }}
            style={{ flex: 1 }}
          />
        </View>
      }
    >
      <SurfaceCard>
        <View style={styles.metaRow}>
          <Badge label={cat} accent={accent} />
          {notice.is_pinned ? <Badge label="Pinned" accent="green" icon="pin" /> : null}
          <Text style={[styles.metaDate, { color: theme.colors.textSecondary }]}>
            {formatDisplayDate(notice.publish_date) || notice.publish_date || '—'}
          </Text>
        </View>
        <Text style={[styles.body, { color: theme.colors.textPrimary }]}>
          {notice.content}
        </Text>
        {notice.expiry_date ? (
          <Text style={[styles.expiry, { color: theme.colors.textSecondary }]}>
            Expires: {formatDisplayDate(notice.expiry_date) || notice.expiry_date}
          </Text>
        ) : null}
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metaDate: { fontSize: 12 },
  body: { fontSize: 15, lineHeight: 22 },
  expiry: { fontSize: 12, marginTop: 16 },
  footerRow: { flexDirection: 'row', gap: 10 },
});
