/**
 * IconTabs — underline tab bar with optional icon-over-label, horizontally
 * scrollable. Used where a screen has 3+ in-page sections (e.g. Academics,
 * Notices, Events). Complements SegmentedControl (pill style) for 2–4 options.
 */

import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTeacherTheme } from '../theme/useTeacherTheme';

export interface IconTab {
  key: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface IconTabsProps {
  tabs: IconTab[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Stack icon above label (reference Notices/Events) vs inline label only. */
  stacked?: boolean;
  scrollable?: boolean;
}

export function IconTabs({ tabs, activeKey, onChange, stacked = false, scrollable = true }: IconTabsProps) {
  const theme = useTeacherTheme();

  const content = tabs.map((tab) => {
    const active = tab.key === activeKey;
    const color = active ? theme.colors.primary : theme.colors.textSecondary;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, stacked && styles.tabStacked, !scrollable && styles.tabFlex]}
        onPress={() => onChange(tab.key)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.label}
      >
        <View style={[styles.tabInner, stacked && styles.tabInnerStacked]}>
          {tab.icon ? <Ionicons name={tab.icon} size={stacked ? 20 : 16} color={color} /> : null}
          <Text style={[styles.label, { color }, active && styles.labelActive]} numberOfLines={1}>
            {tab.label}
          </Text>
        </View>
        <View
          style={[
            styles.underline,
            { backgroundColor: active ? theme.colors.primary : 'transparent' },
          ]}
        />
      </TouchableOpacity>
    );
  });

  if (!scrollable) {
    return (
      <View style={[styles.staticRow, { borderBottomColor: theme.colors.border }]}>{content}</View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollRow, { borderBottomColor: theme.colors.border }]}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRow: { gap: 20, borderBottomWidth: StyleSheet.hairlineWidth, paddingRight: 16 },
  staticRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { paddingTop: 4 },
  tabFlex: { flex: 1 },
  tabStacked: { minWidth: 64 },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8, justifyContent: 'center' },
  tabInnerStacked: { flexDirection: 'column', gap: 4 },
  label: { fontSize: 13, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
  underline: { height: 2.5, borderRadius: 2, width: '100%' },
});
