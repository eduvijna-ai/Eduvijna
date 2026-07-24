/** Badge + StatusPill — small colored labels and attendance/leave status pills. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { accentColors, type AccentKey } from '../theme/accents';

interface BadgeProps {
  label: string;
  accent?: AccentKey;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Badge({ label, accent = 'teal', icon }: BadgeProps) {
  const theme = useTeacherTheme();
  const { bg, fg } = accentColors(theme.colors, accent);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={fg} /> : null}
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export type PillStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'leave'
  | 'half_day'
  | 'paid'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'submitted'
  | 'graded'
  | 'active'
  | 'closed'
  | 'scheduled'
  | 'draft'
  | 'cancelled'
  | 'processing'
  | 'generated';

const STATUS_META: Record<PillStatus, { accent: AccentKey; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  present: { accent: 'green', icon: 'checkmark-circle', label: 'Present' },
  absent: { accent: 'red', icon: 'close-circle', label: 'Absent' },
  late: { accent: 'orange', icon: 'time', label: 'Late' },
  leave: { accent: 'teal', icon: 'remove-circle', label: 'Leave' },
  half_day: { accent: 'purple', icon: 'contrast', label: 'Half Day' },
  paid: { accent: 'green', icon: 'checkmark-circle', label: 'Paid' },
  pending: { accent: 'orange', icon: 'time', label: 'Pending' },
  approved: { accent: 'green', icon: 'checkmark-circle', label: 'Approved' },
  rejected: { accent: 'red', icon: 'close-circle', label: 'Rejected' },
  submitted: { accent: 'blue', icon: 'cloud-done', label: 'Submitted' },
  graded: { accent: 'green', icon: 'ribbon', label: 'Graded' },
  active: { accent: 'green', icon: 'ellipse', label: 'Active' },
  closed: { accent: 'teal', icon: 'lock-closed', label: 'Closed' },
  scheduled: { accent: 'blue', icon: 'calendar', label: 'Scheduled' },
  draft: { accent: 'purple', icon: 'create', label: 'Draft' },
  cancelled: { accent: 'red', icon: 'close-circle', label: 'Cancelled' },
  processing: { accent: 'blue', icon: 'time', label: 'Processing' },
  generated: { accent: 'teal', icon: 'document-text', label: 'Generated' },
};

interface StatusPillProps {
  status: PillStatus;
  label?: string;
  showIcon?: boolean;
}

export function StatusPill({ status, label, showIcon = true }: StatusPillProps) {
  const meta = STATUS_META[status];
  return <Badge label={label ?? meta.label} accent={meta.accent} icon={showIcon ? meta.icon : undefined} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
});
