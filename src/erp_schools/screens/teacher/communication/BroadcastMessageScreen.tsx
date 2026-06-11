/** Broadcast Message — compose a message to a class/group of parents. */

import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import {
  TeacherScreen,
  ScreenHeader,
  SurfaceCard,
  FormField,
  TextField,
  SelectField,
  InfoBanner,
  PrimaryButton,
} from '../../../components';
import { useTeacherNavigation } from '../../../hooks/useTeacherNavigation';
import { useTeacherData } from '../../../hooks/useTeacherData';

export default function BroadcastMessageScreen() {
  const navigation = useTeacherNavigation();
  const { classes } = useTeacherData();
  const [audience, setAudience] = useState<string | null>(classes[0]?.id ?? null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const audienceOptions = [
    ...classes.map((c) => ({ label: `${c.name} Parents`, value: c.id })),
    { label: 'All My Classes', value: 'all' },
  ];

  const onSend = () => {
    if (!message.trim()) {
      Alert.alert('Empty message', 'Please write a message before sending.');
      return;
    }
    Alert.alert('Message sent', 'Your message has been broadcast (demo).', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <TeacherScreen
      header={<ScreenHeader title="Broadcast Message" />}
      contentStyle={styles.content}
      footer={<PrimaryButton label="Send Message" icon="send" variant="gradient" onPress={onSend} />}
    >
      <SurfaceCard>
        <View style={styles.form}>
          <FormField label="Send to" required>
            <SelectField options={audienceOptions} value={audience} onChange={setAudience} />
          </FormField>
          <FormField label="Subject">
            <TextField value={subject} onChangeText={setSubject} placeholder="e.g. Homework reminder" />
          </FormField>
          <FormField label="Message" required>
            <TextField value={message} onChangeText={setMessage} placeholder="Write your message…" multiline />
          </FormField>
        </View>
      </SurfaceCard>
      <InfoBanner text="Parents will receive this as a notification and in their message inbox." />
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 14 },
  form: { gap: 16 },
});
