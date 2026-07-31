/**
 * Exam Group Detail — web ExamGroupsSubView group drawer parity.
 * Lists exam items inside a group with per-item quick actions.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  Badge,
  EmptyState,
  ScreenLoader,
  PrimaryButton,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherExamsData, type ExamItemRow } from '../../../hooks/useTeacherExamsData';
import type { TeacherStackParamList } from '../../../types/navigation';
import { extractErrorMessage } from '../../../utils/apiHelpers';

export default function ExamGroupDetailScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'ExamGroupDetail'>>();
  const navigation = useTeacherNavigation();
  const groupId = route.params?.groupId;
  const exams = useTeacherExamsData('groups');

  const [items, setItems] = useState<ExamItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const group = useMemo(() => exams.groups.find((g) => g.id === groupId), [exams.groups, groupId]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await exams.loadGroupItems(groupId);
      setItems(rows);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]),
  );

  const onDeactivateGroup = () => {
    Alert.alert(
      'Deactivate group?',
      `Deactivate “${group?.name || 'this group'}”? Exams inside it stay, but the group is hidden.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const ok = await exams.deactivateGroup(groupId);
              if (ok) navigation.goBack();
              else Alert.alert('Failed', exams.error || 'Could not deactivate group.');
            })();
          },
        },
      ],
    );
  };

  const onRemoveItem = (item: ExamItemRow) => {
    Alert.alert('Remove exam?', `Remove “${item.name}” from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await exams.deactivateItem(groupId, item.id);
            if (ok) void loadItems();
            else Alert.alert('Failed', exams.error || 'Could not remove exam.');
          })();
        },
      },
    ]);
  };

  if (loading && items.length === 0) {
    return (
      <TeacherScreen header={<ScreenHeader title="Exam Group" />}>
        <ScreenLoader message="Loading exam group…" />
      </TeacherScreen>
    );
  }

  return (
    <TeacherScreen
      header={
        <ScreenHeader
          title={group?.name || 'Exam Group'}
          trailingIcon="create-outline"
          onTrailingPress={() => navigation.navigate('CreateExamGroup', { groupId })}
          trailingAccessibilityLabel="Edit group"
        />
      }
      contentStyle={styles.content}
      refreshing={loading}
      onRefresh={() => void loadItems()}
      footer={
        <PrimaryButton
          label="Add Exam"
          icon="add-circle-outline"
          variant="gradient"
          onPress={() => navigation.navigate('CreateExamItem', { groupId })}
        />
      }
    >
      <SurfaceCard style={styles.metaCard}>
        <View style={styles.metaTop}>
          <Badge label={group?.examType || 'General'} accent="blue" />
          <Badge label={group?.status || 'Draft'} accent="teal" />
        </View>
        {group?.description ? (
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {group.description}
          </Text>
        ) : null}
        <View style={styles.metaActions}>
          <TouchableOpacity
            style={[styles.metaBtn, { borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('ExamGrades', { groupId })}
          >
            <Ionicons name="ribbon-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.metaBtnText, { color: theme.colors.primary }]}>Grades</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metaBtn, { borderColor: theme.colors.border }]}
            onPress={onDeactivateGroup}
          >
            <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
            <Text style={[styles.metaBtnText, { color: theme.colors.danger }]}>Deactivate</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {error ? <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{error}</Text> : null}

      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
        Exams ({items.length})
      </Text>

      {items.length === 0 ? (
        <EmptyState
          icon="school-outline"
          title="No exams yet"
          message="Add an exam to this group to start scheduling subjects."
          ctaLabel="Add Exam"
          onCtaPress={() => navigation.navigate('CreateExamItem', { groupId })}
        />
      ) : (
        items.map((item) => (
          <SurfaceCard key={item.id} style={styles.itemCard}>
            <View style={styles.itemTop}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {item.session ? `Session ${item.session}` : 'Session not set'}
                </Text>
              </View>
              <View style={styles.itemBadges}>
                <Badge
                  label={item.isPublished ? 'Published' : 'Draft'}
                  accent={item.isPublished ? 'green' : 'orange'}
                />
                <Badge
                  label={item.isResultPublished ? 'Result out' : 'Result hidden'}
                  accent={item.isResultPublished ? 'green' : 'orange'}
                />
              </View>
            </View>

            <View style={styles.chipRow}>
              <ActionChip
                icon="create-outline"
                label="Edit"
                onPress={() => navigation.navigate('CreateExamItem', { groupId, itemId: item.id })}
              />
              <ActionChip
                icon="book-outline"
                label="Subjects"
                onPress={() => navigation.navigate('ExamSubjects', { groupId, itemId: item.id })}
              />
              <ActionChip
                icon="people-outline"
                label="Students"
                onPress={() => navigation.navigate('ExamStudents', { groupId, itemId: item.id })}
              />
              <ActionChip
                icon="pencil-outline"
                label="Marks"
                onPress={() => navigation.navigate('ExamMarksEntry', { groupId, itemId: item.id })}
              />
              <ActionChip
                icon="trophy-outline"
                label="Result"
                onPress={() =>
                  navigation.navigate('ExamResultsManage', { groupId, itemId: item.id })
                }
              />
              <ActionChip
                icon="close-circle-outline"
                label="Remove"
                danger
                onPress={() => onRemoveItem(item)}
              />
            </View>
          </SurfaceCard>
        ))
      )}
    </TeacherScreen>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTeacherTheme();
  const color = danger ? theme.colors.danger : theme.colors.textPrimary;
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: danger ? theme.colors.danger : theme.colors.border }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={13} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 12, paddingBottom: 24 },
  metaCard: { gap: 10 },
  metaTop: { flexDirection: 'row', gap: 8 },
  metaActions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaBtnText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  itemCard: { gap: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700' },
  itemBadges: { alignItems: 'flex-end', gap: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
