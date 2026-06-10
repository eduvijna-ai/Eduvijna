/** Create Notice — compose a class/group/school notice (UI only). */

import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  SegmentedControl,
  FormField,
  TextField,
  PrimaryButton,
  type Segment,
} from '../../../components';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import type { TeacherStackParamList } from '../../../types/navigation';

const SCOPES: Segment[] = [
  { key: 'class', label: 'Class', icon: 'people-outline' },
  { key: 'group', label: 'Group', icon: 'people-circle-outline' },
  { key: 'school', label: 'School', icon: 'business-outline' },
];

export default function CreateNoticeScreen() {
  const theme = useTeacherTheme();
  const route = useRoute<RouteProp<TeacherStackParamList, 'CreateNotice'>>();
  const navigation = useTeacherNavigation();
  const [scope, setScope] = useState<string>(route.params?.scope ?? 'class');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  const onPublish = () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a notice title.');
      return;
    }
    Alert.alert(scheduled ? 'Notice scheduled' : 'Notice published', `"${title}" has been ${scheduled ? 'scheduled' : 'published'} (demo).`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <TeacherScreen
      header={<ScreenHeader title="Create Notice" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label={scheduled ? 'Schedule Notice' : 'Publish Notice'} icon="megaphone-outline" onPress={onPublish} />}
    >
      <SegmentedControl segments={SCOPES} activeKey={scope} onChange={setScope} />

      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Title" required>
            <TextField value={title} onChangeText={setTitle} placeholder="Notice title" />
          </FormField>
          <FormField label="Message" required>
            <TextField value={body} onChangeText={setBody} placeholder="Write the notice…" multiline />
          </FormField>

          <View style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>Pin this notice</Text>
            <Switch value={pinned} onValueChange={setPinned} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor="#FFFFFF" />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.colors.textPrimary }]}>Schedule for later</Text>
            <Switch value={scheduled} onValueChange={setScheduled} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} thumbColor="#FFFFFF" />
          </View>
        </View>
      </SurfaceCard>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  form: { gap: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
});
