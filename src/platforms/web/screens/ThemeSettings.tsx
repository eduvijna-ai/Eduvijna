/**
 * Web Theme Settings Screen
 * Platform: Web
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

export default function ThemeSettings() {
  const { theme, themeMode, setThemeMode } = useTheme();

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: 'light', label: 'Light', icon: 'sunny' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
    { value: 'system', label: 'System Default', icon: 'desktop' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Theme Settings</Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          Choose how Eduvijna looks to you. Select a theme or sync with your system settings.
        </Text>

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                { 
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                  cursor: 'pointer',
                } as any,
                themeMode === option.value && {
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.colors.primaryLight + '20',
                },
              ]}
              onPress={() => setThemeMode(option.value)}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.iconContainer,
                  { backgroundColor: themeMode === option.value ? theme.colors.primary : theme.colors.surface }
                ]}>
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={themeMode === option.value ? '#FFFFFF' : theme.colors.text}
                  />
                </View>
                <Text style={[
                  styles.optionLabel,
                  { color: theme.colors.text },
                  themeMode === option.value && { fontWeight: '600' }
                ]}>
                  {option.label}
                </Text>
              </View>
              {themeMode === option.value && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.info} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            System Default automatically switches between light and dark themes based on your browser or OS settings.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
  },
  optionsContainer: {
    gap: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
