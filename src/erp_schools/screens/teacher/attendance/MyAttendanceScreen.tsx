/**
 * My Attendance — redirects into Attendance hub on the My Attendance tab.
 * Keeps More-menu route `MyAttendance` working with web-parity staff flow.
 */

import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTeacherTheme } from '../../../theme/useTeacherTheme';
import type { TeacherStackParamList } from '../../../types/navigation';

export default function MyAttendanceScreen() {
  const theme = useTeacherTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<TeacherStackParamList>>();

  useEffect(() => {
    navigation.replace('TeacherAttendance', { tab: 'my-attendance' });
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}
