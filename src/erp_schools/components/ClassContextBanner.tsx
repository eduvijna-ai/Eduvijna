/**
 * ClassContextBanner — teal class header card for class-scoped screens.
 * Reference: class banner with white code badge, meta lines, book watermark.
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

interface ClassContextBannerProps {
  code: string;
  name: string;
  subject: string;
  room: string;
  studentCount?: number;
  /** Optional right-aligned schedule (e.g. "09:20 AM – 10:05 AM"). */
  timeLabel?: string;
}

export function ClassContextBanner({
  code,
  name,
  subject,
  room,
  studentCount,
  timeLabel,
}: ClassContextBannerProps) {
  const theme = useTeacherTheme();

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radius.card,
        },
      ]}
    >
      <Image
        source={require('../../../assets/eduvijna_logo_sidebar_white.png')}
        style={styles.watermark}
        resizeMode="contain"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={[styles.badgeText, { color: theme.colors.primary }]}>{code}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.meta}>
            {subject}
            {room ? ` • ${room}` : ''}
          </Text>
          {studentCount != null ? (
            <View style={styles.studentRow}>
              <Ionicons name="people-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.meta}>{studentCount} Students</Text>
            </View>
          ) : null}
        </View>

        {timeLabel ? (
          <View style={styles.timeBox}>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.timeText}>{timeLabel}</Text>
            </View>
            {room ? (
              <View style={styles.timeRow}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                <Text style={styles.timeText}>{room}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 96,
    justifyContent: 'center',
  },
  watermark: {
    position: 'absolute',
    right: -20,
    top: -12,
    width: 120,
    height: 120,
    opacity: 0.14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 1,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  meta: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '400',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  timeBox: {
    gap: 6,
    alignItems: 'flex-end',
    maxWidth: '36%',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
  },
});
