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
import { handleOpenQuiz } from '@core/services/openQuizHandler';
import { buildQuizGradedResultsNavigationParams } from '@core/services/notificationNavigation';
import { executeStudentAssignedQuizViewResults } from '@core/services/assessmentQuizStart.service';
import { resolveStudentGradedAssignmentSession } from '@core/services/gradedNotificationRouting.service';
import { Alert } from 'react-native';


import type { WebShellScreen } from '../webShellScreens';

type WebNavScreen = WebShellScreen;

interface WebNavigationProps {
  activeScreen: WebNavScreen;
  onNavigate: (screen: WebNavScreen, params?: Record<string, unknown>) => void;
  children: React.ReactNode;
}

export default function WebNavigation({ activeScreen, onNavigate, children }: WebNavigationProps) {
  const user = useUserStore((state) => state.user);
  const { logout, user: authUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme.colors, isDark), [theme.colors, isDark]);
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

  const handleNotificationClick = async (notification: {
    id: number | string;
    type?: string;
    data?: Record<string, unknown>;
  }) => {
    // Mark as read
    await markNotificationRead(notification.id);
    
    // Close dropdown
    setShowNotificationsDropdown(false);
    
    // Navigate based on notification type and data
    const { type, data } = notification;
    const quizId = data?.quiz_id || data?.quizId;
    const openQuizUser = authUser ?? user;

    if (type === 'quiz_graded' && openQuizUser) {
      const gradedParams = buildQuizGradedResultsNavigationParams(
        (data ?? {}) as Parameters<typeof buildQuizGradedResultsNavigationParams>[0],
      );
      let gradedSessionId =
        typeof gradedParams?.sessionId === 'string' ? gradedParams.sessionId : null;
      let gradedClassroomId = String(data?.classroom_id ?? data?.classroomId ?? '');
      const gradedStudentId =
        typeof gradedParams?.studentId === 'string'
          ? gradedParams.studentId
          : openQuizUser.role === 'student'
            ? String(openQuizUser.id)
            : undefined;

      if (
        gradedParams &&
        !gradedSessionId &&
        openQuizUser.role === 'student' &&
        gradedStudentId
      ) {
        const resolved = await resolveStudentGradedAssignmentSession(
          gradedStudentId,
          gradedParams.quizId as string | number,
        );
        if (resolved.kind === 'resolved') {
          gradedSessionId = resolved.sessionId;
          gradedClassroomId = resolved.classroomId;
        } else if (resolved.kind === 'ambiguous') {
          onNavigate('assessments');
          return;
        }
      }

      if (gradedParams && gradedSessionId && gradedStudentId && openQuizUser.role === 'student') {
        await executeStudentAssignedQuizViewResults(
          {
            studentId: gradedStudentId,
            quizId: gradedParams.quizId as string | number,
            sessionId: gradedSessionId,
            classroomId: gradedClassroomId,
            quizName: gradedParams.quizName as string | undefined,
          },
          {
            onNavigate: (screen, params) =>
              onNavigate(screen as WebNavScreen, params as Record<string, unknown> | undefined),
          },
        );
        return;
      }

      if (gradedParams && (openQuizUser.role === 'instructor' || openQuizUser.role === 'admin')) {
        onNavigate('QuizResultsScreen', {
          ...gradedParams,
          isTeacherView: true,
          studentId: gradedStudentId ?? gradedParams.studentId,
        });
        return;
      }

      if (gradedParams && gradedSessionId) {
        onNavigate('QuizResultsScreen', gradedParams);
        return;
      }

      onNavigate('assessments');
      return;
    }

    const rawSessionId = data?.session_id ?? data?.sessionId;
    const sessionId =
      typeof rawSessionId === 'string'
        ? rawSessionId
        : typeof rawSessionId === 'number'
          ? String(rawSessionId)
          : null;

    if (sessionId && openQuizUser) {
      await handleOpenQuiz(sessionId, 'notification', openQuizUser, {
        navigate: (screen, params) => onNavigate(screen as WebNavScreen, params),
        alert: Alert.alert,
      });
      return;
    }

    switch (type) {
      case 'quiz_assigned':
        if (quizId) {
          onNavigate('QuizPreviewScreen', { quizId });
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
            source={
              isDark
                ? require('../../../../assets/eduvijna_logo_sidebar_white.png')
                : require('../../../../assets/eduvijna_logo_sidebar.png')
            }
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <View style={styles.nav}>
          <NavItem
            title="Dashboard"
            active={activeScreen === 'dashboard'}
            styles={styles}
            onPress={() => onNavigate('dashboard')}
          />
          <NavItem
            title="Assessments"
            active={activeScreen === 'assessments'}
            styles={styles}
            onPress={() => onNavigate('assessments')}
          />
          <NavItem
            title="Analytics"
            active={activeScreen === 'analytics'}
            styles={styles}
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
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            
            {/* Notification Icon */}
            <NotificationBell
              unreadCount={unreadCount}
              onPress={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              iconColor={theme.colors.text}
            />

            {/* Theme Toggle Icon */}
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={toggleTheme}
            >
              <Ionicons 
                name={isDark ? 'sunny-outline' : 'moon-outline'} 
                size={24} 
                color={theme.colors.text}
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
                  <Ionicons name="person" size={20} color={theme.colors.buttonText} />
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
          onNavigate(screen as WebNavScreen);
        }}}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

type NavItemStyles = {
  navItem: object;
  navItemActive: object;
  navItemText: object;
  navItemTextActive: object;
};

function NavItem({
  title,
  active,
  onPress,
  styles,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  styles: NavItemStyles;
}) {
  return (
    <TouchableOpacity
      style={[styles.navItem, active && styles.navItemActive]}
      onPress={onPress}
    >
      <Text style={[styles.navItemText, active && styles.navItemTextActive]}>{title}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (colors: Record<string, string>, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  sidebar: {
    width: 250,
    backgroundColor: isDark ? colors.cardBackground : '#1F2937',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  logo: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: isDark ? '#111827' : '#374151',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  navItemText: {
    fontSize: 16,
    color: isDark ? colors.textSecondary : '#9CA3AF',
  },
  navItemTextActive: {
    color: colors.buttonText,
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userInfo: {
    marginBottom: 12,
  },
  userRole: {
    fontSize: 12,
    color: isDark ? colors.textSecondary : '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: colors.buttonText,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: isDark ? '#111827' : '#374151',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '500',
  },
  main: {
    flex: 1,
  },
  header: {
    height: 64,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
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
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: 40,
  },
  headerUser: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
});
