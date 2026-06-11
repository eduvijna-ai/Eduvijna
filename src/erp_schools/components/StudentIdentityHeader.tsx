/**
 * StudentIdentityHeader — the teal banner + overlapping identity card used at the
 * top of student detail screens (Attendance, Academics, Timetable, Fee, …).
 *
 * Sits in content BELOW the host CustomHeader (mirrors how Teacher uses
 * ScreenHeader / ClassContextBanner). Solid teal fill per DESIGN.md class banner
 * rule (no SVG gradient). The white identity card overlaps the curved teal base.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { Avatar } from './Avatar';

interface StudentIdentityHeaderProps {
  title: string;
  studentName: string;
  className: string;
  rollNo: string;
  admissionNo?: string;
  avatarUrl?: string;
  showBack?: boolean;
  onBack?: () => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
  /** Right-aligned slot on the identity card (academic-year pill or KPI box). */
  rightSlot?: React.ReactNode;
}

const OVERLAP = 40;

export function StudentIdentityHeader({
  title,
  studentName,
  className,
  rollNo,
  admissionNo,
  avatarUrl,
  showBack = true,
  onBack,
  trailingIcon,
  onTrailingPress,
  rightSlot,
}: StudentIdentityHeaderProps) {
  const theme = useTeacherTheme();
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.banner,
          { backgroundColor: theme.colors.primary, paddingBottom: OVERLAP + 16 },
        ]}
      >
        <View style={styles.topRow}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.side}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.side} />
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <TouchableOpacity
            onPress={onTrailingPress}
            style={styles.side}
            disabled={!trailingIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Header action"
          >
            {trailingIcon ? <Ionicons name={trailingIcon} size={22} color="#FFFFFF" /> : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardWrap}>
        <View
          style={[
            styles.card,
            theme.shadow.medium,
            { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card },
          ]}
        >
          <Avatar name={studentName} uri={avatarUrl} size={56} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>{studentName}</Text>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {className} • Roll No: {rollNo}
            </Text>
            {admissionNo ? (
              <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                Admission No: {admissionNo}
              </Text>
            ) : null}
          </View>
          {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  banner: { paddingTop: 8, paddingHorizontal: 12, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  side: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  cardWrap: { marginTop: -OVERLAP, paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  info: { flex: 1, gap: 2, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  right: { alignItems: 'flex-end' },
});
