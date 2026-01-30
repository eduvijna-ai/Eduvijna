/**
 * Main App Entry Point
 * Platform detection and routing to appropriate UI with authentication
 * Deep linking support for cross-platform assessment access
 */

import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, StyleSheet, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './src/core/hooks/useAuth';
import { useNotificationPolling } from './src/core/hooks/useNotificationPolling';
import { ThemeProvider } from './src/context/ThemeContext';
import { DropdownProvider } from './src/context/DropdownContext';
import { AuthProvider } from './src/core/context/AuthContext';
import { navigationRef } from './src/core/services/navigationService';
import { setAuthErrorNavigationCallback } from './src/core/services/dashboardApi';
import { initializeCache } from './src/core/services/cacheService';
import LoadingSpinner from './src/components/LoadingSpinner';
import {
  getInitialDeepLink,
  subscribeToDeepLinks,
  parseDeepLink,
  DeepLinkData,
} from './src/core/services/deepLinkService';
import { handleAssessmentNavigation } from './src/core/services/deepLinkNavigationHandler';
import { PushNotificationService } from './src/core/services/PushNotificationService';

// Platform-specific imports
import MobileNavigation from './src/platforms/mobile/navigation/BottomTabNavigator';
import WebNavigation from './src/platforms/web/navigation/WebNavigation';
import AssessmentsScreen from './src/screens/Assessments';
import AnalyticsScreen from './src/platforms/web/screens/Analytics';
import ProfileScreen from './src/platforms/web/screens/Profile';
import NotificationsScreen from './src/screens/Notifications';
import ThemeSettingsScreen from './src/platforms/web/screens/ThemeSettings';
import TeacherDashboard from './src/screens/TeacherDashboard';
import StudentDashboard from './src/screens/StudentDashboard';
import StudentListWeb from './src/screens/StudentList';
import ClassesListWeb from './src/screens/ClassesList';
import CreateAIQuizScreen from './src/screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from './src/screens/CreateDocumentQuizScreen';
import CreateImageQuizScreen from './src/screens/CreateImageQuizScreen';
import CreateYouTubeQuizScreen from './src/screens/CreateYouTubeQuizScreen';
import CreateWebsiteQuizScreen from './src/screens/CreateWebsiteQuizScreen';
import QuizPreviewScreen from './src/screens/QuizPreviewScreen';
import QuizResultsScreen from './src/screens/QuizResultsScreen';
import QuizTakingScreen from './src/screens/QuizTakingScreen';
import MobileLoginScreen from './src/platforms/mobile/screens/Login';
import WebLoginScreen from './src/platforms/web/screens/Login';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const notificationPolling = useNotificationPolling(); // Poll for notifications via API
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'assessments' | 'analytics' | 'profile' | 'notifications' | 'theme' | 'students' | 'classes' | 'ClassesList' | 'StudentList' | 'Assessments' | 'CreateAIQuizScreen' | 'CreateDocumentQuizScreen' | 'CreateImageQuizScreen' | 'CreateYouTubeQuizScreen' | 'CreateWebsiteQuizScreen' | 'QuizPreviewScreen' | 'QuizResultsScreen' | 'QuizTakingScreen'>('dashboard');
  const [navigationParams, setNavigationParams] = useState<any>({});
  const [pendingDeepLink, setPendingDeepLink] = useState<DeepLinkData | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const processedNotifications = useRef<Set<string>>(new Set());

  // Platform detection
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  // Log notification polling status (for debugging)
  useEffect(() => {
    if (notificationPolling.polling) {
      console.log('🔄 Notification polling active, last poll:', notificationPolling.lastPoll);
    } else if (notificationPolling.error) {
      console.error('❌ Notification polling error:', notificationPolling.error);
    }
  }, [notificationPolling.polling, notificationPolling.lastPoll, notificationPolling.error]);

  // Initialize cache on app startup
  useEffect(() => {
    initializeCache().then(() => {
      // Cache initialized
    });
  }, []);

  // Initialize push notifications on app launch (only if enabled)
  useEffect(() => {
    if (!isMobile) return;
    
    // Initialize push on app launch - only generates token if push is enabled
    PushNotificationService.initializeOnAppLaunch().catch((error) => {
      console.error('❌ Failed to initialize push on app launch:', error);
    });
  }, [isMobile]);

  // Sync push status after successful login
  useEffect(() => {
    if (!isMobile || !isAuthenticated) return;
    
    // Sync push status after login - re-registers if needed and push is enabled
    PushNotificationService.syncStatusAfterLogin().catch((error) => {
      console.error('❌ Failed to sync push status after login:', error);
    });
  }, [isMobile, isAuthenticated]);

  // Set up notification listeners to receive notifications
  useEffect(() => {
    if (!isMobile) return;

    console.log('🔔 Setting up notification listeners...');

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received in foreground:', notification);
      // Notification will auto-display due to setNotificationHandler in PushNotificationService
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const notificationId = response.notification.request.identifier;
      
      // Prevent processing the same notification multiple times
      if (processedNotifications.current.has(notificationId)) {
        console.log('⏭️ Notification already processed, skipping:', notificationId);
        return;
      }
      
      console.log('👆 User tapped notification:', response);
      processedNotifications.current.add(notificationId);
      
      // Clear old processed notifications (keep only last 50)
      if (processedNotifications.current.size > 50) {
        const entries = Array.from(processedNotifications.current);
        processedNotifications.current = new Set(entries.slice(-50));
      }
      
      // Handle notification tap - navigate to relevant screen
      const data = response.notification.request.content.data;
      const notificationBody = response.notification.request.content.body || '';
      
      if (data?.assessmentId && navigationRef.current) {
        console.log('🔗 Navigating to assessment:', data.assessmentId);
        const userRole = (user?.role === 'instructor' || user?.role === 'admin') ? 'instructor' : 'student';
        
        const deepLinkData: DeepLinkData = {
          type: 'assessment',
          assessmentId: data.assessmentId,
          sessionId: data.sessionId,
        };
        
        // Create navigation handler wrapper
        const navHandler = {
          navigate: (screen: string, params?: any) => {
            if (navigationRef.current) {
              (navigationRef.current as any).navigate(screen, params);
            }
          },
          goBack: () => {
            if (navigationRef.current) {
              navigationRef.current.goBack();
            }
          }
        };
        
        handleAssessmentNavigation(
          deepLinkData,
          userRole,
          navHandler
        );
      } else {
        // Handle notifications without assessmentId or sessionId
        console.log('📋 Notification data missing quiz info:', data);
        
        let message = 'This quiz is not available right now.';
        let title = 'Quiz Unavailable';
        
        // Try to determine the reason based on notification content or data
        if (notificationBody.toLowerCase().includes('not started') || 
            notificationBody.toLowerCase().includes('scheduled') ||
            data?.status === 'scheduled') {
          message = 'The quiz time has not started yet. Please wait for the scheduled time.';
          title = 'Quiz Not Started';
        } else if (notificationBody.toLowerCase().includes('expired') || 
                   notificationBody.toLowerCase().includes('ended') ||
                   data?.status === 'expired') {
          message = 'This quiz has already ended and is no longer available.';
          title = 'Quiz Ended';
        } else if (notificationBody.toLowerCase().includes('cancelled') ||
                   data?.status === 'cancelled') {
          message = 'This quiz has been cancelled.';
          title = 'Quiz Cancelled';
        } else if (!data?.assessmentId && !data?.sessionId) {
          message = 'Unable to find quiz information. Please check your Notifications list.';
          title = 'Quiz Information Missing';
        }
        
        // Show alert to user
        Alert.alert(
          title,
          message,
          [
            {
              text: 'Go to Notifications',
              onPress: () => {
                if (navigationRef.current) {
                  (navigationRef.current as any).navigate('Notifications');
                }
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isMobile]); // Removed user dependency to prevent listener recreation

  // Set up auth error navigation callback
  useEffect(() => {
    const handleAuthError = async () => {
      console.log('🔒 Auth error detected - logging out and redirecting to login');
      
      // Call logout to clear all auth state
      await logout();
      
      // For mobile, navigation will automatically show login screen
      // For web, we need to manually redirect
      if (isWeb) {
        setActiveScreen('dashboard'); // Reset to dashboard which will show login
      }
    };
    
    setAuthErrorNavigationCallback(handleAuthError);
  }, [logout, isWeb]);

  // Handle navigation between screens with params support
  const handleNavigate = (screen: string, params?: any) => {
    setActiveScreen(screen as any);
    setNavigationParams(params || {});
  };

  // Deep link handling for mobile
  useEffect(() => {
    if (!isMobile || !isAuthenticated) return;

    // Handle initial deep link (app opened from link)
    const handleInitialLink = async () => {
      const url = await getInitialDeepLink();
      if (url) {
        const deepLinkData = parseDeepLink(url);
        if (deepLinkData?.type === 'assessment') {
          console.log('📱 Processing initial deep link');
          setPendingDeepLink(deepLinkData);
        }
      }
    };

    handleInitialLink();

    // Subscribe to deep links while app is running
    const unsubscribe = subscribeToDeepLinks((deepLinkData) => {
      if (deepLinkData?.type === 'assessment') {
        console.log('📱 Processing runtime deep link');
        setPendingDeepLink(deepLinkData);
      }
    });

    return unsubscribe;
  }, [isMobile, isAuthenticated]);

  // Process pending deep link after authentication
  useEffect(() => {
    if (isMobile && isAuthenticated && pendingDeepLink && navigationRef.current) {
      console.log('🔗 Handling pending deep link');
      
      const userRole = (user?.role === 'instructor' || user?.role === 'admin') ? 'instructor' : 'student';
      
      handleAssessmentNavigation(
        pendingDeepLink,
        userRole,
        {
          navigate: (screen: string, params?: any) => {
            if (navigationRef.current) {
              (navigationRef.current as any).navigate(screen, params);
            }
          },
        }
      );

      setPendingDeepLink(null);
    }
  }, [isMobile, isAuthenticated, pendingDeepLink, user]);

  // Deep link handling for web - detect openquiz route and redirect to mobile
  useEffect(() => {
    if (!isWeb) return;

    const detectAndRedirect = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      
      // Match /openquiz pattern
      if (path.includes('/openquiz') && search.includes('session_id')) {
        const params = new URLSearchParams(search);
        const sessionId = params.get('session_id');
        
        console.log('🌐 Web openquiz route detected:', sessionId);
        
        // Build deep link URL
        const deepLinkUrl = `eduvijna://openquiz${search}`;
        
        // Try to open mobile app
        const attemptAppOpen = setTimeout(() => {
          // If app didn't open after 2 seconds, user likely doesn't have it installed
          // Continue with web experience - don't redirect to store
          console.log('📱 App not installed or user chose to stay on web');
        }, 2000);
        
        // Attempt to open the app silently
        window.location.href = deepLinkUrl;
        
        // If user stays on web, clear timeout and continue normally
        window.addEventListener('blur', () => {
          clearTimeout(attemptAppOpen);
          console.log('📱 App opened successfully');
        }, { once: true });
      }
    };

    detectAndRedirect();
  }, [isWeb]);

  // Note: Notification listeners are set up in the earlier useEffect (lines 101-161)
  // This prevents duplicate listener registration

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner size={80} fullScreen />
      </View>
    );
  }

  if (isMobile) {
    // Mobile: Use React Navigation with authentication check and deep linking
    const linking = {
      prefixes: ['eduvijna://', 'https://ui.eduvijna.com'],
      config: {
        screens: {
          Main: {
            screens: {
              Dashboard: 'dashboard',
              Assessments: 'assessments',
              Analytics: 'analytics',
              Profile: 'profile',
              Notifications: 'notifications',
              Theme: 'theme',
            },
          },
          QuizTakingScreen: 'openquiz',
          StudentList: 'students',
          ClassesList: 'classes',
          CreateAIQuizScreen: 'create-ai-quiz',
          CreateDocumentQuizScreen: 'create-document-quiz',
          CreateImageQuizScreen: 'create-image-quiz',
          CreateYouTubeQuizScreen: 'create-youtube-quiz',
          CreateWebsiteQuizScreen: 'create-website-quiz',
          QuizPreviewScreen: 'quiz-preview',
          QuizResultsScreen: 'quiz-results',
        },
      },
    };

    return (
      <NavigationContainer ref={navigationRef} linking={linking}>
        {isAuthenticated ? <MobileNavigation /> : <MobileLoginScreen />}
      </NavigationContainer>
    );
  }

  if (isWeb) {
    // Web: Check authentication before showing sidebar navigation
    if (!isAuthenticated) {
      return <WebLoginScreen />;
    }

    // Web: Use Sidebar Navigation
    const renderScreen = () => {
      switch (activeScreen) {
        case 'dashboard':
          // Route to appropriate dashboard based on user role
          if (user?.role === 'instructor' || user?.role === 'admin') {
            return <TeacherDashboard onNavigate={handleNavigate} />;
          }
          return <StudentDashboard navigation={{ navigate: handleNavigate }} />;
        case 'assessments':
        case 'Assessments':
          return <AssessmentsScreen 
            userRole={user?.role === 'instructor' || user?.role === 'admin' ? 'instructor' : 'student'} 
            onNavigate={handleNavigate}
            route={{ params: navigationParams }}
          />;
        case 'analytics':
          return <AnalyticsScreen />;
        case 'profile':
          return <ProfileScreen />;
        case 'notifications':
          return <NotificationsScreen />;
        case 'theme':
          return <ThemeSettingsScreen />;
        case 'students':
        case 'StudentList':
          return <StudentListWeb onNavigate={handleNavigate} route={{ params: navigationParams }} />;
        case 'classes':
        case 'ClassesList':
          return <ClassesListWeb onNavigate={handleNavigate} />;
        case 'CreateAIQuizScreen':
          return <CreateAIQuizScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('dashboard') }} />;
        case 'CreateDocumentQuizScreen':
          return <CreateDocumentQuizScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('dashboard') }} />;
        case 'CreateImageQuizScreen':
          return <CreateImageQuizScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('dashboard') }} />;
        case 'CreateYouTubeQuizScreen':
          return <CreateYouTubeQuizScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('dashboard') }} />;
        case 'CreateWebsiteQuizScreen':
          return <CreateWebsiteQuizScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('dashboard') }} />;
        case 'QuizPreviewScreen':
          return <QuizPreviewScreen navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('assessments') }} />;
        case 'QuizResultsScreen':
          return <QuizResultsScreen 
            navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('assessments') }} 
            route={{ params: navigationParams }} 
          />;
        case 'QuizTakingScreen':
          return <QuizTakingScreen 
            navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('assessments') }} 
            route={{ params: navigationParams }}
          />;
        default:
          // Default dashboard based on user role
          if (user?.role === 'instructor' || user?.role === 'admin') {
            return <TeacherDashboard onNavigate={handleNavigate} />;
          }
          return <StudentDashboard navigation={{ navigate: handleNavigate }} />;
      }
    };

    return (
      <WebNavigation activeScreen={activeScreen} onNavigate={(screen) => handleNavigate(screen)}>
        {renderScreen()}
      </WebNavigation>
    );
  }

  // Fallback (should never reach here)
  return null;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DropdownProvider>
          <AppContent />
        </DropdownProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
