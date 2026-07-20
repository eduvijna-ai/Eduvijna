import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { KPITileData } from '../../core/utils/analyticsUiUtils';

const COLOR_MAP = {
  green: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', icon: '#10b981' },
  amber: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#d97706' },
  red: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#dc2626' },
  blue: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#2563eb' },
  purple: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', icon: '#7c3aed' },
};

interface Props {
  tiles: KPITileData[];
}

export default function AnalyticsKPIGrid({ tiles }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tiles.map((tile, i) => {
        const c = COLOR_MAP[tile.color];
        return (
          <View key={i} style={[styles.tile, { backgroundColor: c.bg, borderColor: c.border }]}>
            <View style={styles.tileTop}>
              <View style={[styles.iconWrap, { backgroundColor: '#fff' }]}>
                <Ionicons name={tile.icon as any} size={18} color={c.icon} />
              </View>
              <Text style={[styles.title, { color: c.text }]} numberOfLines={2}>{tile.title}</Text>
            </View>
            <Text style={[styles.value, { color: c.text }]}>{tile.value}</Text>
            {tile.subtitle ? <Text style={[styles.subtitle, { color: c.text }]}>{tile.subtitle}</Text> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  tile: {
    width: 140,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
  },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 },
  value: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 10, marginTop: 4, opacity: 0.8 },
});
