/**
 * Parent Communication — conversations + announcements + quick actions.
 * Reference: assets/teachers_screens/teachers_parent communication.png
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TeacherScreen,
  ScreenHeader,
  ClassContextBanner,
  QuickActionGrid,
  SurfaceCard,
  SectionHeader,
  ListItem,
  Badge,
  PrimaryButton,
  type QuickAction,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';
import { conversations, communicationAnnouncements } from '../../../data';

export default function ParentCommunicationScreen() {
  const theme = useTeacherTheme();
  const navigation = useTeacherNavigation();
  const { classes } = useTeacherData();
  const classInfo = classes[0];

  const actions: QuickAction[] = [
    { key: 'message', icon: 'chatbubble-ellipses-outline', label: 'Send Message', accent: 'green', onPress: () => navigation.navigate('BroadcastMessage') },
    { key: 'announce', icon: 'megaphone-outline', label: 'Announcement', accent: 'purple', onPress: () => navigation.navigate('CreateNotice', { scope: 'class' }) },
    { key: 'group', icon: 'people-outline', label: 'Group Message', accent: 'orange', onPress: () => navigation.navigate('BroadcastMessage') },
    { key: 'history', icon: 'mail-outline', label: 'Message History', accent: 'blue', onPress: () => undefined },
  ];

  return (
    <TeacherScreen
      header={<ScreenHeader title="Parent Communication" trailingIcon="ellipsis-horizontal" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="New Message" icon="chatbubble-outline" variant="gradient" onPress={() => navigation.navigate('BroadcastMessage')} />}
    >
      {classInfo ? (
        <ClassContextBanner code={classInfo.code} name={classInfo.name} subject={classInfo.subject} room={classInfo.room} studentCount={classInfo.studentCount} />
      ) : null}

      <QuickActionGrid actions={actions} columns={4} />

      <SurfaceCard padded={false} style={styles.listCard}>
        <View style={styles.cardHead}>
          <SectionHeader title="Recent Conversations" actionLabel="View All" onAction={() => undefined} />
        </View>
        {conversations.map((conversation, index) => (
          <ListItem
            key={conversation.id}
            avatarName={conversation.isGroup ? undefined : conversation.parentName}
            icon={conversation.isGroup ? 'people' : undefined}
            iconAccent="purple"
            title={`${conversation.parentName}`}
            subtitle={`${conversation.studentName}${conversation.studentRollNo ? ` (${conversation.studentRollNo})` : ''}\n${conversation.preview}`}
            divider={index < conversations.length - 1}
            onPress={() => navigation.navigate('ParentChat', { conversationId: conversation.id })}
            trailing={
              <View style={styles.convRight}>
                <Text style={[styles.convTime, { color: theme.colors.textSecondary }]}>{conversation.timeLabel}</Text>
                {conversation.unread > 0 ? (
                  <View style={[styles.unread, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.unreadText}>{conversation.unread}</Text>
                  </View>
                ) : null}
                {conversation.parentRelation !== 'Group' ? (
                  <Badge label={conversation.parentRelation} accent={conversation.parentRelation === 'Mother' ? 'pink' : 'blue'} />
                ) : (
                  <Badge label="Group" accent="purple" />
                )}
              </View>
            }
          />
        ))}
      </SurfaceCard>

      <View style={styles.section}>
        <SectionHeader title="Recent Announcements" actionLabel="View All" onAction={() => navigation.navigate('NoticeBoard', {})} />
        {communicationAnnouncements.map((item) => (
          <SurfaceCard key={item.id} style={[styles.announceCard, { backgroundColor: item.isNew ? theme.colors.tintGreen : theme.colors.tintPurple }]}>
            <View style={styles.announceRow}>
              <View style={[styles.announceIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name={item.isNew ? 'megaphone-outline' : 'calendar-outline'} size={18} color={theme.colors.primary} />
              </View>
              <View style={styles.announceBody}>
                <View style={styles.announceTitleRow}>
                  <Text style={[styles.announceTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
                  {item.isNew ? <Badge label="NEW" accent="green" /> : null}
                </View>
                <Text style={[styles.announceText, { color: theme.colors.textSecondary }]} numberOfLines={3}>{item.body}</Text>
              </View>
              <Text style={[styles.announceDate, { color: theme.colors.textSecondary }]}>{item.date}</Text>
            </View>
          </SurfaceCard>
        ))}
      </View>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  listCard: { paddingHorizontal: 14, paddingBottom: 4 },
  cardHead: { paddingTop: 12 },
  convRight: { alignItems: 'flex-end', gap: 4 },
  convTime: { fontSize: 11 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  section: { gap: 10 },
  announceCard: {},
  announceRow: { flexDirection: 'row', gap: 12 },
  announceIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  announceBody: { flex: 1, gap: 4 },
  announceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  announceTitle: { fontSize: 14, fontWeight: '700' },
  announceText: { fontSize: 12, lineHeight: 17 },
  announceDate: { fontSize: 11 },
});
