/**
 * Main App Entry Point
 * Platform detection and routing to appropriate UI with authentication
 * Deep linking support for cross-platform assessment access
 */

import React, { useState, useEffect, useRef } from 'react';
import { Platform, View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
} from './src/core/services/deepLinkService';
import { PushNotificationService } from './src/core/services/PushNotificationService';
import { handleOpenQuiz } from './src/core/services/openQuizHandler';

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
import QuizStatusScreen from './src/screens/QuizStatusScreen';
import QuizLoadingScreen from './src/screens/QuizLoadingScreen';
import MobileLoginScreen from './src/platforms/mobile/screens/Login';
import WebLoginScreen from './src/platforms/web/screens/Login';

function AppContent() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  useNotificationPolling(); // Poll for notifications via API
  const [activeScreen, setActiveScreen] = useState<'dashboard' | 'assessments' | 'analytics' | 'profile' | 'notifications' | 'theme' | 'students' | 'classes' | 'ClassesList' | 'StudentList' | 'Assessments' | 'CreateAIQuizScreen' | 'CreateDocumentQuizScreen' | 'CreateImageQuizScreen' | 'CreateYouTubeQuizScreen' | 'CreateWebsiteQuizScreen' | 'QuizPreviewScreen' | 'QuizResultsScreen' | 'QuizTakingScreen' | 'QuizStatusScreen' | 'QuizLoadingScreen'>('dashboard');
  const [navigationParams, setNavigationParams] = useState<any>({});
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null); // For post-login resume
  const [lastProcessedSessionId, setLastProcessedSessionId] = useState<string | null>(null); // Prevent double execution
  const [lastProcessedTime, setLastProcessedTime] = useState<number>(0); // Debounce guard
  
  // Reset session guards when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      // User logged out, clear guards
      setLastProcessedSessionId(null);
      setLastProcessedTime(0);
      initialDeepLinkProcessed.current = false; // Allow deep link re-processing after logout
    } else {
      // User just authenticated - allow pending deep link to be processed
      // Reset the flag so post-login deep link can run
      initialDeepLinkProcessed.current = false;
    }
  }, [isAuthenticated]);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const processedNotifications = useRef<Set<string>>(new Set());
  const initialDeepLinkProcessed = useRef<boolean>(false);

  
  // Platform detection
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  // Notification polling runs in background

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

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(_notification => {
      // Notification will auto-display due to setNotificationHandler in PushNotificationService
    });

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(async response => {
      const notificationId = response.notification.request.identifier;
      const data = response.notification.request.content.data;
      console.log('🔔 Notification response received:', {
        notificationId,
        data,
      });
      
      // Prevent processing the same notification multiple times
      if (processedNotifications.current.has(notificationId)) {
        return;
      }
      
      // Extract sessionId first
      const sessionId = data?.sessionId || data?.session_id;
      
      // Debugging: Log entire notification data
      console.log('🔍 Full notification data:', data);
      console.log('🔍 Extracted sessionId:', sessionId);

      // Handle missing sessionId
      if (!sessionId) {
        console.log('❌ No sessionId found in notification data');
        Alert.alert('Error', 'Notification data is incomplete. Please try again.');
        processedNotifications.current.add(notificationId);
        return;
      }

      // Check authentication
      if (!isAuthenticated) {
        console.log('🔒 User not authenticated, saving sessionId for post-login');
        setPendingSessionId(sessionId);
        processedNotifications.current.add(notificationId);
        return;
      }

      // Use centralized handler for notification processing
      processedNotifications.current.add(notificationId);
      await handleOpenQuiz(sessionId, 'notification', user, {
        navigate: (screen, params) => {
          if (navigationRef.current) {
            (navigationRef.current as any).navigate(screen, params);
          }
        },
        alert: Alert.alert,
      }, setPendingSessionId);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isMobile, isAuthenticated, user]); // Include auth state to handle login changes

  // Process pending sessionId after successful login
  useEffect(() => {
    if (!isMobile || !isAuthenticated || !pendingSessionId || !user) return;

    const sessionId = pendingSessionId;

    // Clear pending sessionId
    setPendingSessionId(null);

    // Wait for navigation to be ready after login
    const waitForNavigation = async () => {
      if (!navigationRef.current) {
        setTimeout(waitForNavigation, 100);
        return;
      }

      // Use unified handler
      const navigationAdapter = { 
        navigate: (screen: string, params?: any) => {
          if (navigationRef.current) {
            (navigationRef.current as any).navigate(screen, params);
          }
        }, 
        alert: Alert.alert 
      };
      await handleOpenQuiz(sessionId, 'post_login', user, navigationAdapter, setPendingSessionId).catch((error) => {
        console.error('❌ Error in post-login handleOpenQuiz:', error);
      });
    };

    // Start waiting for navigation
    waitForNavigation();
  }, [isMobile, isAuthenticated, pendingSessionId, user]);

  // Set up auth error navigation callback
  useEffect(() => {
    const handleAuthError = async () => {
      
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
    if (!isMobile) return;

    // Handle initial deep link (app opened from link) - only once per app launch
    const handleInitialLink = async () => {
      // Prevent multiple calls to getInitialURL()
      if (initialDeepLinkProcessed.current) {
        console.log('🚫 Initial deep link already processed, skipping');
        return;
      }

      try {
        const url = await getInitialDeepLink();
        initialDeepLinkProcessed.current = true; // Mark as processed
        
        if (url) {
          console.log('🔗 Processing initial deep link:', url);
          const deepLinkData = parseDeepLink(url);
          if (deepLinkData?.type === 'assessment' && deepLinkData.sessionId) {
            const sessionId = deepLinkData.sessionId;
            
            // If not authenticated, save sessionId and show login
            if (!isAuthenticated) {
              console.log('👤 Not authenticated, saving sessionId for post-login:', sessionId);
              setPendingSessionId(sessionId);
              return;
            }

            // Guard: Allow different sessions, only block true duplicates
            const now = Date.now();
            const isDifferentSession = sessionId !== lastProcessedSessionId;
            const isDuplicateRecent = sessionId === lastProcessedSessionId && now - lastProcessedTime < 2000;
            
            if (isDuplicateRecent) {
              console.log('🚫 Blocking duplicate initial session within 2 seconds:', sessionId);
              return;
            }
            
            if (isDifferentSession) {
              console.log('✅ Processing new different initial session:', sessionId);
            } else {
              console.log('✅ Re-processing same initial session (after timeout):', sessionId);
            }
            
            setLastProcessedSessionId(sessionId);
            setLastProcessedTime(now);

        // Use unified handler
        if (navigationRef.current && user) {
          const navigationAdapter = { 
            navigate: (screen: string, params?: any) => {
              if (navigationRef.current) {
                (navigationRef.current as any).navigate(screen, params);
              }
            }, 
            alert: Alert.alert 
          };
          await handleOpenQuiz(sessionId, 'deep_link', user, navigationAdapter, setPendingSessionId);
        }
          } else {
            console.log('🔗 Initial deep link parsed but not assessment type:', deepLinkData);
          }
        } else {
          console.log('🔗 No initial deep link URL found');
        }
      } catch (error) {
        console.error('❌ Error in handleInitialLink:', error);
        initialDeepLinkProcessed.current = true; // Mark as processed even on error
      }
    };

    handleInitialLink();

    // Subscribe to deep links while app is running
    const unsubscribe = subscribeToDeepLinks(async (deepLinkData) => {
      if (deepLinkData?.type === 'assessment' && deepLinkData.sessionId) {
        const sessionId = deepLinkData.sessionId;
        
        // If not authenticated, save sessionId and show login
        if (!isAuthenticated) {
          setPendingSessionId(sessionId);
          return;
        }

        // Guard: Allow different sessions, only block true duplicates
        const now = Date.now();
        const isDifferentSession = sessionId !== lastProcessedSessionId;
        const isDuplicateRecent = sessionId === lastProcessedSessionId && now - lastProcessedTime < 2000;
        
        if (isDuplicateRecent) {
          console.log('🚫 Blocking duplicate session within 2 seconds:', sessionId);
          return;
        }
        
        if (isDifferentSession) {
          console.log('✅ Processing new different session:', sessionId);
        } else {
          console.log('✅ Re-processing same session (after timeout):', sessionId);
        }
        
        setLastProcessedSessionId(sessionId);
        setLastProcessedTime(now);

        // Use unified handler
        if (navigationRef.current && user) {
          const navigationAdapter = { 
            navigate: (screen: string, params?: any) => (navigationRef.current as any)?.navigate(screen, params), 
            alert: Alert.alert 
          };
          await handleOpenQuiz(sessionId, 'deep_link', user, navigationAdapter, setPendingSessionId);
        }
      }
    });

    return unsubscribe;
  }, [isMobile, isAuthenticated, user]); // Include auth to handle state changes

  // Process pending deep link after authentication - REMOVED
  // Now handled directly in deep link handlers above with pendingSessionId

  // Deep link handling for web - detect openquiz route and redirect to mobile
  useEffect(() => {
    if (!isWeb) return;

    const detectAndRedirect = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      
      // Match /openquiz pattern
      if (path.includes('/openquiz') && search.includes('session_id')) {
        // Build deep link URL
        const deepLinkUrl = `eduvijna://openquiz${search}`;
        
        // Try to open mobile app
        const attemptAppOpen = setTimeout(() => {
          // If app didn't open after 2 seconds, user likely doesn't have it installed
          // Continue with web experience - don't redirect to store
        }, 2000);
        
        // Attempt to open the app silently
        window.location.href = deepLinkUrl;
        
        // If user stays on web, clear timeout and continue normally
        window.addEventListener('blur', () => {
          clearTimeout(attemptAppOpen);
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
        <ActivityIndicator size="large" color="#1B4F5C" />
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
          Dashboard: 'openquiz',
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
        case 'QuizStatusScreen':
          return <QuizStatusScreen 
            navigation={{ navigate: handleNavigate, goBack: () => handleNavigate('assessments') }} 
            route={{ params: navigationParams }}
          />;
        case 'QuizLoadingScreen':
          return <QuizLoadingScreen 
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
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DropdownProvider>
            <AppContent />
          </DropdownProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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
