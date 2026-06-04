/**
 * TabBar – reusable horizontal tab bar component.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@context/ThemeContext';

export interface TabItem {
  key: string;
  label: string;
  /** Optional badge count. */
  count?: number;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  /** Use scrollable variant for many tabs. Defaults to flex-row. */
  scrollable?: boolean;
}

export default function TabBar({ tabs, activeKey, onChange, scrollable }: TabBarProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const renderTab = (tab: TabItem) => {
    const active = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tab,
          !scrollable && { flex: 1 },
          active && { borderBottomColor: colors.primary },
        ]}
        onPress={() => onChange(tab.key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>
          {tab.label}
        </Text>
        {tab.count != null ? (
          <View style={[styles.badge, { backgroundColor: active ? colors.primary : colors.border }]}>
            <Text style={[styles.badgeText, { color: active ? '#fff' : colors.textSecondary }]}>
              {tab.count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (scrollable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {tabs.map(renderTab)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {tabs.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
