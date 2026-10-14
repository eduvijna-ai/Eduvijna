/**
 * Main App Entry Point
 * Platform detection and routing to appropriate UI with authentication
 * Deep linking support for cross-platform assessment access
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useAuth } from './src/core/hooks/useAuth';
import { useNotificationPolling } from './src/core/hooks/useNotificationPolling';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppSideNavProvider } from './src/context/AppSideNavContext';
import { DropdownProvider } from './src/context/DropdownContext';
import { AuthProvider } from './src/core/context/AuthContext';
import ImageCropModal from './src/core/components/ImageCropModal';
import { navigationRef, setWebNavigateHandler } from './src/core/services/navigationService';
import { setAuthErrorNavigationCallback } from './src/core/services/dashboardApi';
import { initializeCache } from './src/core/services/cacheService';
import {
  getInitialDeepLink,
  subscribeToDeepLinks,
  parseDeepLink,
} from './src/core/services/deepLinkService';
import { PushNotificationService } from './src/core/services/PushNotificationService';
import { handleOpenQuiz } from './src/core/services/openQuizHandler';
import { resolveWebShellScreen } from './src/core/utils/webShellRouteAdapter';
import {
  IMPLEMENTATION_SHA,
  logMobileBuildIdentification,
} from './src/core/utils/buildIdentification';

// Platform-specific imports
import MobileNavigation from './src/platforms/mobile/navigation/BottomTabNavigator';
import WebNavigation from './src/platforms/web/navigation/WebNavigation';
import AssessmentsScreen from './src/screens/Assessments';
import AnalyticsHubScreen from './src/screens/AnalyticsHubScreen';
import ProfileScreen from './src/platforms/web/screens/Profile';
import NotificationsScreen from './src/screens/Notifications';
import ThemeSettingsScreen from './src/platforms/web/screens/ThemeSettings';
import TeacherDashboard from './src/screens/TeacherDashboard';
import StudentDashboard from './src/screens/StudentDashboard';
import StudentListWeb from './src/screens/StudentList';
import ClassesListWeb from './src/screens/ClassesList';
import CreateAIQuizScreen from './src/screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from './src/screens/CreateDocumentQuizScreen';
import DocumentUploadHomeScreen from './src/screens/document-upload/DocumentUploadHomeScreen';
import DocumentUploadPreviewScreen from './src/screens/document-upload/DocumentUploadPreviewScreen';
import DocumentCurriculumGeneratedPreviewScreen from './src/screens/document-upload/DocumentCurriculumGeneratedPreviewScreen';
import DocumentUploadHistoryScreen from './src/screens/document-upload/DocumentUploadHistoryScreen';
import DocumentUploadQuizScreen from './src/screens/document-upload/DocumentUploadQuizScreen';
import DocumentLibraryScreen from './src/screens/document-upload/DocumentLibraryScreen';
import BookPageViewerScreen from './src/screens/document-upload/BookPageViewerScreen';
import WorksheetScreen from './src/screens/WorksheetScreen';
import type { WebShellScreen } from './src/platforms/web/webShellScreens';
import CreateImageQuizScreen from './src/screens/CreateImageQuizScreen';
import CreateYouTubeQuizScreen from './src/screens/CreateYouTubeQuizScreen';
import CreateWebsiteQuizScreen from './src/screens/CreateWebsiteQuizScreen';
import CreateHandwrittenQuizScreen from './src/screens/CreateHandwrittenQuizScreen';
import QuizPreviewScreen from './src/screens/QuizPreviewScreen';
import QuizResultsScreen from './src/screens/QuizResultsScreen';
import QuizTakingScreen from './src/screens/QuizTakingScreen';
import QuizStatusScreen from './src/screens/QuizStatusScreen';
import QuizLoadingScreen from './src/screens/QuizLoadingScreen';
import ERPNavigator from './src/erp/navigation/ERPNavigator';
import MobileLoginScreen from './src/platforms/mobile/screens/Login';
import WebLoginScreen from './src/platforms/web/screens/Login';
import { useAppFonts } from './src/theme/useAppFonts';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { installGlobalErrorHandlers } from './src/core/services/errorLogger';

installGlobalErrorHandlers();

function AppContent() {
  const { isAuthenticated, isInitializing, user, logout } = useAuth();
  useNotificationPolling(); // Poll for notifications via API
  const [activeScreen, setActiveScreen] = useState<WebShellScreen>('dashboard');
  const [navigationParams, setNavigationParams] = useState<any>({});
  const webNavStackRef = useRef<Array<{ screen: WebShellScreen; params: any }>>([]);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null); // For post-login resume
  const [lastProcessedSessionId, setLastProcessedSessionId] = useState<string | null>(null); // Prevent double execution
  const [lastProcessedTime, setLastProcessedTime] = useState<number>(0); // Debounce guard
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const processedNotifications = useRef<Set<string>>(new Set());
  const initialDeepLinkProcessed = useRef<boolean>(false);
  const pendingOpenQuizRef = useRef<{ sessionId: string; quizId?: string } | null>(null);
  const pendingPostLoginQuizIdRef = useRef<string | undefined>(undefined);
  const [mobileNavigationReady, setMobileNavigationReady] = useState(false);
  const isMobile = Platform.OS === 'android' || Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  // Reset session guards when authentication state changes (never replay cold-launch initial URL)
  useEffect(() => {
    if (!isAuthenticated) {
      setLastProcessedSessionId(null);
      setLastProcessedTime(0);
      setPendingSessionId(null);
      webNavStackRef.current = [];
      pendingOpenQuizRef.current = null;
      pendingPostLoginQuizIdRef.current = undefined;
      initialDeepLinkProcessed.current = false;
      setMobileNavigationReady(false);
    }
  }, [isAuthenticated]);

  const dispatchOpenQuizInner = useCallback(
    async (
      sessionId: string,
      source: 'deep_link' | 'post_login' | 'notification',
      quizId?: string,
    ) => {
      if (!user) return;
      const navigationAdapter = {
        navigate: (screen: string, params?: any) => {
          if (navigationRef.current) {
            (navigationRef.current as any).navigate(screen, params);
          }
        },
        alert: Alert.alert,
      };
      if (!navigationRef.isReady()) {
        pendingOpenQuizRef.current = { sessionId, quizId };
        return;
      }
      await handleOpenQuiz(sessionId, source, user, navigationAdapter, setPendingSessionId, {
        quizId,
      });
    },
    [user],
  );

  const dispatchOpenQuiz = dispatchOpenQuizInner;

  const flushPendingOpenQuiz = useCallback(() => {
    if (!isMobile || !isAuthenticated || !user || !pendingOpenQuizRef.current) {
      return;
    }
    if (!navigationRef.isReady()) {
      return;
    }
    const pending = pendingOpenQuizRef.current;
    pendingOpenQuizRef.current = null;
    void dispatchOpenQuizInner(pending.sessionId, 'deep_link', pending.quizId);
  }, [isMobile, isAuthenticated, user, dispatchOpenQuizInner]);

  useEffect(() => {
    flushPendingOpenQuiz();
  }, [flushPendingOpenQuiz, mobileNavigationReady, isAuthenticated, user]);

  // Notification polling runs in background

  useEffect(() => {
    if (__DEV__) {
      (globalThis as typeof globalThis & { __EDUVIJNA_IMPLEMENTATION_SHA__?: string }).__EDUVIJNA_IMPLEMENTATION_SHA__ =
        IMPLEMENTATION_SHA;
    }
    logMobileBuildIdentification();
  }, []);

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

  // Sync push status after successful login (defer so navigation can mount first)
  useEffect(() => {
    if (!isMobile || !isAuthenticated) return;

    const timer = setTimeout(() => {
      PushNotificationService.syncStatusAfterLogin().catch((error) => {
        console.error('❌ Failed to sync push status after login:', error);
      });
    }, 2000);

    return () => clearTimeout(timer);
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
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const { handleAppPushNotificationResponse } = await import(
        './src/core/services/appPushNotificationResponse'
      );
      await handleAppPushNotificationResponse({
        notificationId,
        data,
        isAuthenticated,
        user,
        processedIds: processedNotifications.current,
        setPendingSessionId,
        navigation: {
          navigate: (screen, params) => {
            if (navigationRef.current) {
              (navigationRef.current as any).navigate(screen, params);
            }
          },
        },
      });
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

  const resumePendingOpenQuiz = React.useCallback(
    async (sessionId: string, quizId?: string) => {
      if (!user) {
        setPendingSessionId(sessionId);
        pendingPostLoginQuizIdRef.current = quizId;
        return;
      }

      const webNavigate = (screen: string, params?: any) => {
        setActiveScreen(screen as WebShellScreen);
        setNavigationParams(params || {});
      };

      const navigationAdapter = isMobile
        ? {
            navigate: (screen: string, params?: any) => {
              if (navigationRef.current) {
                (navigationRef.current as any).navigate(screen, params);
              }
            },
            alert: Alert.alert,
          }
        : {
            navigate: webNavigate,
            alert: Alert.alert,
          };

      if (isMobile) {
        const waitForNavigation = async () => {
          if (!navigationRef.current) {
            setTimeout(waitForNavigation, 100);
            return;
          }
          await handleOpenQuiz(sessionId, 'post_login', user, navigationAdapter, setPendingSessionId, {
            quizId,
          }).catch(
            (error) => {
              console.error('❌ Error in post-login handleOpenQuiz:', error);
            },
          );
        };
        waitForNavigation();
        return;
      }

      await handleOpenQuiz(sessionId, 'post_login', user, navigationAdapter, setPendingSessionId, {
        quizId,
      }).catch(
        (error) => {
          console.error('❌ Error in post-login handleOpenQuiz (web):', error);
        },
      );
    },
    [isMobile, user],
  );

  // Process pending sessionId after successful login (mobile + web)
  useEffect(() => {
    if (!isAuthenticated || !pendingSessionId || !user) return;

    const sessionId = pendingSessionId;
    const quizId = pendingPostLoginQuizIdRef.current;
    pendingPostLoginQuizIdRef.current = undefined;
    setPendingSessionId(null);
    resumePendingOpenQuiz(sessionId, quizId);
  }, [isAuthenticated, pendingSessionId, user, resumePendingOpenQuiz]);

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
    const resolved = resolveWebShellScreen(screen);
    webNavStackRef.current.push({ screen: activeScreen, params: navigationParams });
    setActiveScreen(resolved as WebShellScreen);
    setNavigationParams(params || {});
  };

  const handleNavigateRef = useRef(handleNavigate);
  handleNavigateRef.current = handleNavigate;
  useEffect(() => {
    if (!isWeb) {
      setWebNavigateHandler(null);
      return;
    }
    setWebNavigateHandler((screen, params) => handleNavigateRef.current(screen, params));
    return () => setWebNavigateHandler(null);
  }, [isWeb]);

  // Web screens are rendered outside React Navigation stack, so provide
  // a compatibility navigation object used by screen components that call
  // navigate/goBack/replace/setOptions.
  const createWebNavigation = (defaultBackScreen: string = 'dashboard') => ({
    navigate: (screen: string, params?: any) => handleNavigate(screen, params),
    replace: (screen: string, params?: any) => {
      setActiveScreen(resolveWebShellScreen(screen) as WebShellScreen);
      setNavigationParams(params || {});
    },
    goBack: () => {
      const previous = webNavStackRef.current.pop();
      if (previous) {
        setActiveScreen(previous.screen);
        setNavigationParams(previous.params || {});
        return;
      }
      setActiveScreen(defaultBackScreen as WebShellScreen);
      setNavigationParams({});
    },
    canGoBack: () => webNavStackRef.current.length > 0,
    push: (screen: string, params?: any) => handleNavigate(screen, params),
    pop: () => {
      const previous = webNavStackRef.current.pop();
      if (previous) {
        setActiveScreen(previous.screen);
        setNavigationParams(previous.params || {});
      }
    },
    setOptions: (_options: any) => {},
  });

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
              pendingPostLoginQuizIdRef.current = deepLinkData.quizId;
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

            await dispatchOpenQuiz(sessionId, 'deep_link', deepLinkData.quizId);
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
          pendingPostLoginQuizIdRef.current = deepLinkData.quizId;
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

        await dispatchOpenQuiz(sessionId, 'deep_link', deepLinkData.quizId);
      }
    });

    return unsubscribe;
  }, [isMobile, isAuthenticated, user, dispatchOpenQuiz]); // Include auth to handle state changes

  // Process pending deep link after authentication - REMOVED
  // Now handled directly in deep link handlers above with pendingSessionId

  // Web /openquiz — queue session for login continuation (survives logout/auth expiry without reload)
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const path = window.location.pathname;
    const search = window.location.search;
    if (!path.includes('/openquiz') || !search.includes('session_id')) {
      return;
    }

    const deepLinkData = parseDeepLink(`https://app.eduvijna.com/openquiz${search}`);
    if (deepLinkData?.type !== 'assessment' || !deepLinkData.sessionId) {
      return;
    }

    const sessionId = deepLinkData.sessionId;
    if (!isAuthenticated || !user) {
      setPendingSessionId(sessionId);
      pendingPostLoginQuizIdRef.current = deepLinkData.quizId;
      return;
    }

    setPendingSessionId(sessionId);
    pendingPostLoginQuizIdRef.current = deepLinkData.quizId;
  }, [isWeb, isAuthenticated, user]);

  // Note: Notification listeners are set up in the earlier useEffect (lines 101-161)
  // This prevents duplicate listener registration

  // Show loading screen only during first auth check (not during login submit)
  if (isInitializing) {
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
          CreateHandwrittenQuizScreen: 'create-handwritten-quiz',
          QuizPreviewScreen: 'quiz-preview',
          QuizResultsScreen: 'quiz-results',
        },
      },
    };

    return (
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        onReady={() => {
          setMobileNavigationReady(true);
          flushPendingOpenQuiz();
        }}
      >
        {isAuthenticated ? (
          <AppSideNavProvider>
            <MobileNavigation />
          </AppSideNavProvider>
        ) : (
          <MobileLoginScreen />
        )}
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
          return <AnalyticsHubScreen />;
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
          return <CreateAIQuizScreen navigation={createWebNavigation('dashboard')} />;
        case 'CreateDocumentQuizScreen':
        case 'DocumentUploadHomeScreen':
          return (
            <DocumentUploadHomeScreen
              navigation={createWebNavigation('dashboard')}
              route={{ params: navigationParams }}
            />
          );
        case 'DocumentUploadPreviewScreen':
          return (
            <DocumentUploadPreviewScreen
              navigation={createWebNavigation('DocumentUploadHomeScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'DocumentCurriculumGeneratedPreviewScreen':
          return (
            <DocumentCurriculumGeneratedPreviewScreen
              navigation={createWebNavigation('DocumentUploadHomeScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'DocumentUploadHistoryScreen':
          return (
            <DocumentUploadHistoryScreen
              navigation={createWebNavigation('DocumentUploadHomeScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'DocumentUploadQuizScreen':
          return (
            <DocumentUploadQuizScreen
              navigation={createWebNavigation('DocumentUploadPreviewScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'DocumentLibraryScreen':
          return (
            <DocumentLibraryScreen
              navigation={createWebNavigation('DocumentUploadHomeScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'BookPageViewerScreen':
          return (
            <BookPageViewerScreen
              navigation={createWebNavigation('DocumentLibraryScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'CreateImageQuizScreen':
          return <CreateImageQuizScreen navigation={createWebNavigation('dashboard')} />;
        case 'CreateYouTubeQuizScreen':
          return <CreateYouTubeQuizScreen navigation={createWebNavigation('dashboard')} />;
        case 'CreateWebsiteQuizScreen':
          return <CreateWebsiteQuizScreen navigation={createWebNavigation('dashboard')} />;
        case 'CreateHandwrittenQuizScreen':
          return <CreateHandwrittenQuizScreen navigation={createWebNavigation('dashboard')} />;
        case 'QuizPreviewScreen':
          return (
            <QuizPreviewScreen
              navigation={createWebNavigation('assessments')}
              route={{ params: navigationParams }}
            />
          );
        case 'QuizResultsScreen':
          return <QuizResultsScreen 
            navigation={createWebNavigation('assessments')} 
            route={{ params: navigationParams }} 
          />;
        case 'QuizTakingScreen':
          return <QuizTakingScreen 
            navigation={createWebNavigation('assessments')} 
            route={{ params: navigationParams }}
          />;
        case 'QuizStatusScreen':
          return <QuizStatusScreen 
            navigation={createWebNavigation('assessments')} 
            route={{ params: navigationParams }}
          />;
        case 'QuizLoadingScreen':
          return <QuizLoadingScreen 
            route={{ params: navigationParams }}
          />;
        case 'WorksheetScreen':
          return (
            <WorksheetScreen
              navigation={createWebNavigation('DocumentUploadPreviewScreen')}
              route={{ params: navigationParams }}
            />
          );
        case 'ERP':
          return (
            <NavigationContainer independent>
              <ERPNavigator />
            </NavigationContainer>
          );
        default:
          // Default dashboard based on user role
          if (user?.role === 'instructor' || user?.role === 'admin') {
            return <TeacherDashboard onNavigate={handleNavigate} />;
          }
          return <StudentDashboard navigation={{ navigate: handleNavigate }} />;
      }
    };

    return (
      <WebNavigation activeScreen={activeScreen} onNavigate={handleNavigate}>
        {renderScreen()}
      </WebNavigation>
    );
  }

  // Fallback (should never reach here)
  return null;
}

function AppWithFonts() {
  const { fontsLoaded, fontError } = useAppFonts();

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B4F5C" />
      </View>
    );
  }

  return <AppContent />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <DropdownProvider>
              <AppWithFonts />
              <ImageCropModal />
            </DropdownProvider>
          </AuthProvider>
        </ThemeProvider>
      </AppErrorBoundary>
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
