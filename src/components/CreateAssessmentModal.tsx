/**
 * CreateAssessmentModal Component
 * 
 * Compact dropdown showing quiz generation options below the "+" button in header.
 * Only shows assessment types the current user is permitted to access.
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuizNavItems, SCREEN_DEFAULTS } from '@core/hooks/useQuizNavItems';

/** Hard-coded fallback items shown when API returns nothing */
const FALLBACK_OPTIONS = [
  { screen: 'CreateAIQuizScreen',          iconColor: '#0891B2', label: 'AI Assessment',  icon: 'bulb' },
  { screen: 'DocumentUploadHomeScreen',    iconColor: '#0F766E', label: 'Document Upload', icon: 'folder-open' },
  { screen: 'AssessmentWorkspaceScreen',   iconColor: '#DC2626', label: 'Document',       icon: 'document', routeParams: { mode: 'document' } },
  { screen: 'CreateImageQuizScreen',       iconColor: '#D97706', label: 'Image',          icon: 'image' },
  { screen: 'CreateYouTubeQuizScreen',     iconColor: '#059669', label: 'YouTube',        icon: 'logo-youtube' },
  { screen: 'AssessmentWorkspaceScreen',   iconColor: '#7C3AED', label: 'Handwritten',    icon: 'create', routeParams: { mode: 'handwritten' } },
  { screen: 'WorksheetScreen',             iconColor: '#059669', label: 'Worksheet',      icon: 'document-text' },
  { screen: 'RecentAssessmentsScreen',     iconColor: '#6366F1', label: 'Recent Quizzes', icon: 'time' },
];

interface CreateAssessmentModalProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
  theme: any;
  isDark?: boolean;
}

export default function CreateAssessmentModal({ 
  visible, 
  onClose, 
  navigation,
  theme,
  isDark = false 
}: CreateAssessmentModalProps) {
  const insets = useSafeAreaInsets();
  const { items: navItems, loading, fetchStatus } = useQuizNavItems();

  const options = useMemo(() => {
    if (fetchStatus === 'ready') {
      return navItems;
    }
    if (fetchStatus === 'error') {
      return FALLBACK_OPTIONS.map((f) => ({
        screen: f.screen,
        label: f.label,
        subtitle: SCREEN_DEFAULTS[f.screen]?.subtitle ?? '',
        iconName: f.icon,
        iconColor: f.iconColor,
        bgColor: SCREEN_DEFAULTS[f.screen]?.bg ?? '#F1F5F9',
        display_order: 0,
        routeParams: (f as any).routeParams,
      }));
    }
    return [];
  }, [navItems, fetchStatus]);

  const handleQuizTypePress = (screen: string, routeParams?: Record<string, any>) => {
    onClose();

    const useWorkspaceRedirect = Platform.OS !== 'web';

    const resolvedScreen =
      useWorkspaceRedirect && (screen === 'CreateDocumentQuizScreen' || screen === 'CreateHandwrittenQuizScreen')
        ? 'AssessmentWorkspaceScreen'
        : screen;

    const resolvedParams =
      (useWorkspaceRedirect ? routeParams : undefined) ??
      (useWorkspaceRedirect && screen === 'CreateDocumentQuizScreen'
        ? { mode: 'document' }
        : useWorkspaceRedirect && screen === 'CreateHandwrittenQuizScreen'
          ? { mode: 'handwritten' }
          : undefined);

    setTimeout(() => {
      if (navigation) {
        navigation.navigate(resolvedScreen as never, resolvedParams as never);
      }
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <View 
        style={[
          styles.dropdownContainer,
          {
            backgroundColor: theme.colors.card,
            top: insets.top + 60,
            shadowOpacity: isDark ? 0.45 : 0.3,
          },
        ]}
      >
        <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>
          Create Assessment
        </Text>

        {loading && options.length === 0 ? (
          <Text style={[styles.menuText, { color: theme.colors.textSecondary, paddingVertical: 8 }]}>
            Loading modules…
          </Text>
        ) : null}
        
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.screen}
            style={[
              styles.menuItem, 
              { borderBottomColor: theme.colors.border },
              index === options.length - 1 && { borderBottomWidth: 0 }
            ]}
            onPress={() => handleQuizTypePress(option.screen, (option as any).routeParams)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: option.iconColor }]}>
              <Ionicons name={option.iconName as any} size={14} color="#FFF" />
            </View>
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownContainer: {
    position: 'absolute',
    right: 16,
    borderRadius: 8,
    padding: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: 200,
    overflow: 'hidden',
    zIndex: 1000,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 0.5,
  },
  menuIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
