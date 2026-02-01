/**
 * Shared Header Component
 * Works on iOS, Android, and Web
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@core/hooks/useAuth';
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

interface HeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onNavigate?: (screen: string, params?: any) => void;
  navigation?: any;
  notificationCount?: number;
  showCreateButton?: boolean;
}

export default function Header({ 
  onNotificationPress, 
  onProfilePress,
  onNavigate,
  navigation,
  notificationCount = 0,
  showCreateButton = true,
}: HeaderProps) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const handleCreateOption = (option: CreateOption) => {
    setShowCreateMenu(false);
    
    // Support both navigation prop and onNavigate callback
    if (navigation?.navigate) {
      navigation.navigate(option.screen);
    } else if (onNavigate) {
      onNavigate(option.screen);
    }
  };

  const isTeacher = user?.role === 'instructor';
  
  return (
    <View style={styles.container}>
      {/* Logo and Name */}
      <View style={styles.logoSection}>
        <TouchableOpacity 
          style={styles.logo}
          onPress={() => {
            if (onNavigate) {
              // For web navigation
              onNavigate('dashboard');
            } else if (navigation && (navigation as any).canGoBack?.()) {
              // For mobile navigation - just go back
              (navigation as any).goBack();
            }
          }}
        >
          <Image 
            source={require('../../../assets/eduvijna_logo_sidebar.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Create Button (Teachers Only) */}
      {isTeacher && showCreateButton && (
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateMenu(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      )}

      {/* Right Section: Notifications & Profile */}
      <View style={styles.rightSection}>
        {/* Notification Icon */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={onNotificationPress}
        >
          <Ionicons name="notifications-outline" size={24} color="#374151" />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Theme Toggle */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={isDark ? 'sunny-outline' : 'moon-outline'} 
            size={24} 
            color="#374151" 
          />
        </TouchableOpacity>

        {/* 
        {/* Profile Photo */}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={onProfilePress}
        >
          {user?.avatar_url ? (
            <Image 
              source={{ uri: user.avatar_url }} 
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Create Quiz Dropdown Modal */}
      <Modal
        visible={showCreateMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateMenu(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreateMenu(false)}
        >
          <View style={styles.dropdownContainer}>
            {CREATE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                style={styles.dropdownItem}
                onPress={() => handleCreateOption(option)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        paddingTop: 44, // Status bar height
        height: 104,
      },
      android: {
        paddingTop: 0,
      },
      web: {
        paddingTop: 0,
      },
    }),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 40,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5B21B6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 120 : 80,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
});
