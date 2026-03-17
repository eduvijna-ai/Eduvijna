/**
 * CreateAssessmentModal Component
 * 
 * Compact dropdown showing quiz generation options below the "+" button in header
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CreateAssessmentModalProps {
  visible: boolean;
  onClose: () => void;
  navigation?: any;
  theme: any;
  isDark?: boolean;
}

const QUIZ_OPTIONS = [
  { type: 'CreateAIQuizScreen', title: 'AI Assessment', icon: 'bulb', iconBg: '#0891B2', bg: '#E3F2FD' },
  { type: 'CreateDocumentQuizScreen', title: 'Document', icon: 'document', iconBg: '#DC2626', bg: '#FFE5F1' },
  { type: 'CreateImageQuizScreen', title: 'Image', icon: 'image', iconBg: '#D97706', bg: '#FFF3E0' },
  { type: 'CreateYouTubeQuizScreen', title: 'YouTube', icon: 'logo-youtube', iconBg: '#059669', bg: '#E8F5E9' },
  { type: 'CreateHandwrittenQuizScreen', title: 'Handwritten', icon: 'create', iconBg: '#7C3AED', bg: '#F3E5F5' },
  { type: 'CreateWebsiteQuizScreen', title: 'Website', icon: 'globe', iconBg: '#9C27B0', bg: '#EDE9FE' },
];

export default function CreateAssessmentModal({ 
  visible, 
  onClose, 
  navigation,
  theme,
  isDark = false 
}: CreateAssessmentModalProps) {
  const insets = useSafeAreaInsets();
  
  const handleQuizTypePress = (screen: string) => {
    onClose();
    setTimeout(() => {
      if (navigation) {
        navigation.navigate(screen as never);
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
        style={[styles.dropdownContainer, { backgroundColor: theme.colors.card, top: insets.top + 60 }]}
      >
        <Text style={[styles.dropdownTitle, { color: theme.colors.text }]}>
          Create Assessment
        </Text>
        
        {QUIZ_OPTIONS.map((option, index) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.menuItem, 
              { borderBottomColor: theme.colors.border },
              index === QUIZ_OPTIONS.length - 1 && { borderBottomWidth: 0 }
            ]}
            onPress={() => handleQuizTypePress(option.type)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: option.iconBg }]}>
              <Ionicons name={option.icon as any} size={14} color="#FFF" />
            </View>
            <Text style={[styles.menuText, { color: theme.colors.text }]}>
              {option.title}
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
