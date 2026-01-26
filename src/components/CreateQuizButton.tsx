import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

interface CreateOption {
  type: 'ai' | 'pdf' | 'image' | 'web' | 'youtube' | 'manual';
  title: string;
  description: string;
  icon: string;
  color: string;
  screen: string;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    type: 'ai',
    title: 'AI Assessment',
    description: 'Generate with AI',
    icon: 'sparkles',
    color: '#0EA5E9',
    screen: 'CreateAIQuiz',
  },
  {
    type: 'pdf',
    title: 'Document Assessment',
    description: 'From PDF/Doc',
    icon: 'document-text',
    color: '#EF4444',
    screen: 'CreateDocumentQuiz',
  },
  {
    type: 'image',
    title: 'Image Assessment',
    description: 'From Image',
    icon: 'camera',
    color: '#A855F7',
    screen: 'CreateImageQuiz',
  },
  {
    type: 'web',
    title: 'Website Assessment',
    description: 'From URL',
    icon: 'link',
    color: '#06B6D4',
    screen: 'CreateWebsiteQuiz',
  },
  {
    type: 'youtube',
    title: 'YouTube Assessment',
    description: 'From Video',
    icon: 'logo-youtube',
    color: '#EF4444',
    screen: 'CreateYouTubeQuiz',
  },
  {
    type: 'manual',
    title: 'Manual Assessment',
    description: 'Create Manually',
    icon: 'create-outline',
    color: '#F59E0B',
    screen: 'CreateManualQuiz',
  },
];

interface Props {
  navigation?: any;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function CreateQuizButton({ navigation, onNavigate }: Props) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [showMenu, setShowMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const isWeb = width > 768;

  const handleOptionPress = (option: CreateOption) => {
    setShowMenu(false);
    if (navigation?.navigate) {
      navigation.navigate(option.screen);
    } else if (onNavigate) {
      onNavigate(option.screen);
    }
  };

  return (
    <>
      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowMenu(true)}
        onPressIn={() => isWeb && setShowTooltip(true)}
        onPressOut={() => isWeb && setShowTooltip(false)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Tooltip (Web only on hover) */}
      {showTooltip && isWeb && (
        <View style={[styles.tooltip, { backgroundColor: theme.colors.text }]}>
          <Text style={[styles.tooltipText, { color: theme.colors.background }]}>
            Create Assessment
          </Text>
        </View>
      )}

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuContainer, isWeb && styles.menuContainerWeb]}>
            <View style={[styles.menu, { backgroundColor: theme.colors.card }]}>
              {/* Menu Header */}
              <View style={[styles.menuHeader, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  Create Assessment
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowMenu(false)}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Menu Options */}
              <View style={styles.menuOptions}>
                {CREATE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[styles.menuOption, { borderBottomColor: theme.colors.border }]}
                    onPress={() => handleOptionPress(option)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                      <Ionicons name={option.icon as any} size={24} color={option.color} />
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
                        {option.title}
                      </Text>
                      <Text style={[styles.optionDescription, { color: theme.colors.textSecondary }]}>
                        {option.description}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltip: {
    position: 'absolute',
    top: 60,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '90%',
    maxWidth: 400,
  },
  menuContainerWeb: {
    maxWidth: 500,
  },
  menu: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  menuOptions: {
    paddingVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
  },
});
