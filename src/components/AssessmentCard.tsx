/**
 * AssessmentCard – reusable card component for quiz / worksheet history items.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

export interface AssessmentCardItem {
  id: number;
  title: string;
  subject?: string;
  class_name?: string;
  level?: string;
  lesson?: string;
  assessment_type?: string;
  question_count?: number;
  created_at?: string;
  source?: string;
}

interface AssessmentCardProps {
  item: AssessmentCardItem;
  onPress: (item: AssessmentCardItem) => void;
  onDelete?: (item: AssessmentCardItem) => void;
  /** Optional accent colour used for the left border / badge. */
  accentColor?: string;
}

const TYPE_ICON: Record<string, string> = {
  general: 'bulb',
  aiquiz: 'bulb',
  'web-quiz': 'bulb',
  competitive: 'trophy',
  worksheet: 'document-text',
  document: 'document-attach',
  documentupload: 'document-attach',
  image: 'image',
  'image-quiz': 'image',
  youtube: 'logo-youtube',
  'youtube-quiz': 'logo-youtube',
  default: 'clipboard',
};

const TYPE_COLOR: Record<string, string> = {
  general: '#0891B2',
  aiquiz: '#0891B2',
  'web-quiz': '#0891B2',
  competitive: '#7C3AED',
  worksheet: '#059669',
  document: '#D97706',
  documentupload: '#0F766E',
  image: '#DC2626',
  'image-quiz': '#DC2626',
  youtube: '#FF0000',
  'youtube-quiz': '#FF0000',
  default: '#64748B',
};

function resolveTypeKey(item: AssessmentCardItem): string {
  const source = (item.source || '').toLowerCase().replace(/\s+/g, '');
  const type = (item.assessment_type || '').toLowerCase();
  if (source && TYPE_ICON[source]) return source;
  if (type && TYPE_ICON[type]) return type;
  if (source.includes('youtube')) return 'youtube';
  if (source.includes('worksheet')) return 'worksheet';
  if (source.includes('document') || source.includes('upload')) return 'documentupload';
  if (source.includes('ai') || type.includes('web-quiz')) return 'aiquiz';
  return 'default';
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AssessmentCard({
  item,
  onPress,
  onDelete,
  accentColor,
}: AssessmentCardProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const typeKey = resolveTypeKey(item);
  const iconName = (TYPE_ICON[typeKey] || TYPE_ICON.default) as any;
  const accent = accentColor || TYPE_COLOR[typeKey] || TYPE_COLOR.default;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderLeftColor: accent,
          borderColor: colors.border,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.iconBadge, { backgroundColor: accent + '1A' }]}>
        <Ionicons name={iconName} size={18} color={accent} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.metaRow}>
          {item.class_name ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.class_name}
            </Text>
          ) : null}
          {item.class_name && item.subject ? (
            <Text style={[styles.metaSep, { color: colors.border }]}>·</Text>
          ) : null}
          {item.subject ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.subject}
            </Text>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          {item.question_count != null ? (
            <Text style={[styles.badge, { backgroundColor: colors.primary + '18', color: colors.primary }]}>
              {item.question_count} Qs
            </Text>
          ) : null}
          {item.level ? (
            <Text style={[styles.badge, { backgroundColor: accent + '18', color: accent }]}>
              {item.level}
            </Text>
          ) : null}
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>

      {onDelete ? (
        <TouchableOpacity
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  meta: {
    fontSize: 12,
  },
  metaSep: {
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  date: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  deleteBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
