/**
 * StudentIdentityHeader — compact teal title strip + overlapping identity card.
 * Sits under the global EduVijna CustomHeader (no safe-area spacer).
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTeacherTheme } from '../theme/useTeacherTheme';
import { Avatar } from './Avatar';

export interface StudentIdentityHeaderProps {
  title: string;
  studentName: string;
  className: string;
  rollNo?: string;
  admissionNo?: string;
  metaBits?: string[];
  avatarUrl?: string;
  showBack?: boolean;
  onBack?: () => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  onTrailingPress?: () => void;
  trailingAccessibilityLabel?: string;
  rightSlot?: React.ReactNode;
}

/** Small tuck so the card sits on the teal edge without a tall empty band. */
const OVERLAP = 16;

function buildMetaLine(
  className: string,
  rollNo?: string,
  admissionNo?: string,
  metaBits?: string[],
): string {
  const parts: string[] = [];
  const cls = className?.trim();
  if (cls) parts.push(cls);
  if (metaBits) {
    for (const b of metaBits) {
      const t = b?.trim();
      if (t && !parts.includes(t)) parts.push(t);
    }
  }
  const roll = rollNo?.trim();
  if (roll && roll !== '—' && roll.toLowerCase() !== 'n/a') {
    parts.push(`Roll No: ${roll}`);
  }
  const adm = admissionNo?.trim();
  if (adm && adm !== '—' && adm.toLowerCase() !== 'n/a') {
    parts.push(`Adm: ${adm}`);
  }
  return parts.join(' · ');
}

export function StudentIdentityHeader({
  title,
  studentName,
  className,
  rollNo,
  admissionNo,
  metaBits,
  avatarUrl,
  showBack = true,
  onBack,
  trailingIcon,
  onTrailingPress,
  trailingAccessibilityLabel,
  rightSlot,
}: StudentIdentityHeaderProps) {
  const theme = useTeacherTheme();
  const navigation = useNavigation();
  const handleBack = onBack ?? (() => navigation.goBack());

  const displayName = studentName?.trim() || 'Student';
  const metaLine = useMemo(
    () => buildMetaLine(className, rollNo, admissionNo, metaBits),
    [className, rollNo, admissionNo, metaBits],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.banner,
          {
            backgroundColor: theme.colors.primary,
            paddingBottom: OVERLAP + 4,
          },
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
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.side} />
          )}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onTrailingPress}
            style={styles.side}
            disabled={!trailingIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={trailingAccessibilityLabel ?? 'Header action'}
          >
            {trailingIcon ? (
              <Ionicons name={trailingIcon} size={20} color="#FFFFFF" />
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardWrap}>
        <View
          style={[
            styles.card,
            theme.shadow.light,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Avatar name={displayName} uri={avatarUrl} size={40} accent="teal" />
          <View style={styles.info}>
            <Text
              style={[styles.name, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {metaLine ? (
              <Text
                style={[styles.meta, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {metaLine}
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
  wrap: { marginBottom: 2 },
  banner: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  side: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  cardWrap: {
    marginTop: -OVERLAP,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  info: { flex: 1, gap: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
  right: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '42%' },
});
