/**
 * Web Navigation (Sidebar + Header)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@core/store/user.store';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import CreateAssessmentModal from '../../../components/CreateAssessmentModal';
import NotificationBell from '../../../components/NotificationBell';
import NotificationsDropdown from '../../../components/NotificationsDropdown';
import useNotifications from '@core/hooks/useNotifications';


interface WebNavigationProps {
  activeScreen: 'dashboard' | 'assessments' | 'analytics' | 'profile' | 'notifications' | 'theme' | 'students' | 'classes' | 'ClassesList' | 'StudentList' | 'Assessments' | 'CreateAIQuizScreen' | 'CreateDocumentQuizScreen' | 'CreateImageQuizScreen' | 'CreateYouTubeQuizScreen' | 'CreateWebsiteQuizScreen' | 'QuizPreviewScreen' | 'QuizResultsScreen' | 'QuizTakingScreen';
  onNavigate: (screen: 'dashboard' | 'assessments' | 'analytics' | 'profile' | 'notifications' | 'theme' | 'students' | 'classes' | 'ClassesList' | 'StudentList' | 'Assessments' | 'CreateAIQuizScreen' | 'CreateDocumentQuizScreen' | 'CreateImageQuizScreen' | 'CreateYouTubeQuizScreen' | 'CreateWebsiteQuizScreen' | 'QuizPreviewScreen' | 'QuizResultsScreen' | 'QuizTakingScreen') => void;
  children: React.ReactNode;
}

export default function WebNavigation({ activeScreen, onNavigate, children }: WebNavigationProps) {
  const user = useUserStore((state) => state.user);
  const { logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications();

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markNotificationRead(notification.id);
    
    // Close dropdown
    setShowNotificationsDropdown(false);
    
    // Navigate based on notification type and data
    const { type, data } = notification;
    const quizId = data?.quiz_id || data?.quizId;

    switch (type) {
      case 'quiz_assigned':
        // New quiz assigned - navigate to quiz preview
        if (quizId) {
          onNavigate('QuizPreviewScreen');
          // Note: In web, you'd need to pass quizId through state or URL params
          // For now, navigate to assessments where user can find the quiz
        } else {
          onNavigate('assessments');
        }
        break;

      case 'quiz_graded':
        // Quiz graded - navigate to results
        if (quizId) {
          onNavigate('QuizResultsScreen');
          // Note: In web, you'd need to pass quizId and studentId through state
        } else {
          onNavigate('assessments');
        }
        break;

      case 'classroom_invite':
        // Classroom invitation - navigate to classes
        onNavigate('classes');
        break;

      case 'announcement':
        // General announcement - stay on notifications or go to dashboard
        onNavigate('notifications');
        break;

      default:
        // For any other type, if there's a quiz ID, go to assessments
        if (quizId) {
          onNavigate('assessments');
        } else {
          onNavigate('dashboard');
        }
        break;
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <TouchableOpacity 
          style={styles.logo}
          onPress={() => onNavigate('dashboard')}
        >
          <Image 
            source={require('../../../../assets/eduvijna_logo_sidebar_white.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.nav}>
          <NavItem
            title="Dashboard"
            active={activeScreen === 'dashboard'}
            onPress={() => onNavigate('dashboard')}
          />
          <NavItem
            title="Assessments"
            active={activeScreen === 'assessments'}
            onPress={() => onNavigate('assessments')}
          />
          <NavItem
            title="Analytics"
            active={activeScreen === 'analytics'}
            onPress={() => onNavigate('ClassesList')}
          />
          {/* <NavItem
            title="Theme"
            active={activeScreen === 'theme'}
            onPress={() => onNavigate('theme')}
          /> */}
        </View>

        <View style={styles.sidebarFooter}>
          <View style={styles.userInfo}>
            <Text style={styles.userRole}>{user?.role}</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.main}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeScreen.charAt(0).toUpperCase() + activeScreen.slice(1)}
          </Text>
          <View style={styles.headerActions}>
            {/* Create Assessment Button - For all users */}
            {(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'student') && (
              <TouchableOpacity 
                style={styles.createAssessmentButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#5B21B6" />
              </TouchableOpacity>
            )}
            
            {/* Notification Icon */}
            <NotificationBell
              unreadCount={unreadCount}
              onPress={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              iconColor="#374151"
            />

            {/* Theme Toggle Icon */}
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

            {/* Profile Photo */}
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => onNavigate('profile')}
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
        </View>

        {/* Content */}
        <View style={styles.content}>{children}</View>
        
        {/* Notifications Dropdown */}
        {showNotificationsDropdown && (
          <NotificationsDropdown
            notifications={notifications}
            loading={notificationsLoading}
            onClose={() => setShowNotificationsDropdown(false)}
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllRead}
            colors={theme.colors}
          />
        )}
      </View>

      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        navigation={{ navigate: (screen: string) => {
          setShowCreateModal(false);
          onNavigate(screen as any);
        }}}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

function NavItem({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
    >
      <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#1F2937',
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  logo: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  nav: {
    flex: 1,
    paddingTop: 16,
  },
  navItem: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  navItemText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  navItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  userInfo: {
    marginBottom: 12,
  },
  userRole: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  main: {
    flex: 1,
  },
  header: {
    height: 64,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createAssessmentButton: {
    padding: 8,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
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
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: 40,
  },
  headerUser: {
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
