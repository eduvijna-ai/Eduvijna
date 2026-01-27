/**
 * Main App Entry Point
 * Platform detection and routing to appropriate UI with authentication
 * Deep linking support for cross-platform assessment access
 */

import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
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
import {
  getInitialDeepLink,
  subscribeToDeepLinks,
  parseDeepLink,
  DeepLinkData,
} from './src/core/services/deepLinkService';
import { handleAssessmentNavigation } from './src/core/services/deepLinkNavigationHandler';

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
    console.log('🚀 Initializing cache service...');
    initializeCache().then(() => {
      console.log('✅ Cache service initialized successfully');
    });
  }, []);

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

  // Push notification listeners for mobile
  useEffect(() => {
    if (!isMobile) return;

    // Configure how notifications are displayed when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Handle notification received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      // You can show an alert or update UI here
    });

    // Handle notification tapped by user
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification data
      if (data?.type === 'quiz' && data?.quizId) {
        // Navigate to quiz
        if (navigationRef.current) {
          (navigationRef.current as any).navigate('QuizTakingScreen', {
            quizId: data.quizId,
            sessionId: data.sessionId,
          });
        }
      } else if (data?.screen) {
        // Navigate to specific screen
        if (navigationRef.current) {
          (navigationRef.current as any).navigate(data.screen, data.params || {});
        }
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
  }, [isMobile]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B21B6" />
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
