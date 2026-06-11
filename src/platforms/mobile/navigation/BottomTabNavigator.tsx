/**
 * Mobile Bottom Tab Navigation
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { navigateToAppMainTab } from './navigateToAppMainTab';
import { APP_MAIN_TABS } from './appRoutes';
import { useAuth } from '@core/hooks/useAuth';
import { get } from '@core/api/config';
import { useTheme } from '@context/ThemeContext';
import { AppSideNavMenuButton } from '@context/AppSideNavContext';
import CreateAssessmentModal from '../../../components/CreateAssessmentModal';
import PushNotificationPrompt from '../../../components/PushNotificationPrompt';
import NotificationHandler from '../../../components/NotificationHandler';
import PushNotificationService from '@core/services/PushNotificationService';

import AssessmentsScreen from '@screens/Assessments';
import ERPNavigator from '../../../erp/navigation/ERPNavigator';
import { SchoolsTabEntry } from '../../../erp_schools/navigation/SchoolsTabEntry';
// import AnalyticsScreen from '../screens/Analytics';
import ProfileScreen from '../screens/Profile';
import NotificationsScreen from '@screens/Notifications';
import TeacherDashboard from '@screens/TeacherDashboard';
import StudentDashboard from '@screens/StudentDashboard';
import StudentList from '@screens/StudentList';
import ClassesList from '@screens/ClassesList';
import CreateAIQuizScreen from '../../../screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from '@screens/CreateDocumentQuizScreen';
import CreateImageQuizScreen from '@screens/CreateImageQuizScreen';
import CreateYouTubeQuizScreen from '@screens/CreateYouTubeQuizScreen';
import CreateWebsiteQuizScreen from '@screens/CreateWebsiteQuizScreen';
import CreateHandwrittenQuizScreen from '@screens/CreateHandwrittenQuizScreen';
import AssessmentWorkspaceScreen from '@screens/AssessmentWorkspaceScreen';
import DocumentUploadHomeScreen from '@screens/document-upload/DocumentUploadHomeScreen';
import DocumentUploadPreviewScreen from '@screens/document-upload/DocumentUploadPreviewScreen';
import DocumentUploadHistoryScreen from '@screens/document-upload/DocumentUploadHistoryScreen';
import DocumentUploadQuizScreen from '@screens/document-upload/DocumentUploadQuizScreen';
import QuizTakingScreen from '@screens/QuizTakingScreen';
import QuizResultsScreen from '@screens/QuizResultsScreen';
import QuizPreviewScreen from '@screens/QuizPreviewScreen';
import StudentAnalyticsScreen from '@screens/StudentAnalyticsScreen';
import TestNotifications from '@screens/TestNotifications';
import QuizStatusScreen from '@screens/QuizStatusScreen';
import QuizLoadingScreen from '@screens/QuizLoadingScreen';
import RecentAssessmentsScreen from '../../../screens/RecentAssessmentsScreen';
import WorksheetScreen from '../../../screens/WorksheetScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Role-based Dashboard Component
function RoleDashboard({ navigation }: any) {
  const { user } = useAuth();
  
  // Route to appropriate dashboard based on user role
  if (user?.role === 'instructor' || user?.role === 'admin') {
    return <TeacherDashboard navigation={navigation} />;
  }
  
  return <StudentDashboard navigation={navigation} />;
}

// Role-based Assessments Component
function RoleAssessments({ navigation, route }: any) {
  const { user } = useAuth();
  const userRole = user?.role === 'instructor' || user?.role === 'admin' ? 'instructor' : 'student';
  return <AssessmentsScreen userRole={userRole} navigation={navigation} route={route} />;
}

// Custom Header Component
function CustomHeader() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fetchedSchoolName, setFetchedSchoolName] = useState('');
  const insets = useSafeAreaInsets();

  const schoolNameFromProfile = (() => {
    const candidates = [
      (user as any)?.school_name,
      (user as any)?.schoolName,
      typeof (user as any)?.school === 'string' ? (user as any)?.school : undefined,
      (user as any)?.school?.name,
      (user as any)?.school?.school_name,
      (user as any)?.profile?.school_name,
      (user as any)?.profile?.schoolName,
      (user as any)?.profile?.school?.name,
      (user as any)?.profile?.school?.school_name,
    ];

    return (
      candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ||
      ''
    );
  })();

  const resolvedSchoolId = (() => {
    const toNum = (v: any): number | undefined => {
      if (v === null || v === undefined || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return (
      toNum((user as any)?.school_id) ??
      toNum((user as any)?.schoolId) ??
      toNum((user as any)?.school?.id) ??
      toNum((user as any)?.school?.school_id) ??
      toNum((user as any)?.profile?.school?.id) ??
      toNum((user as any)?.profile?.school_id) ??
      toNum((user as any)?.profile?.schoolId) ??
      undefined
    );
  })();

  const isSuperAdmin =
    (user as any)?.role_id === 1 ||
    (user as any)?.role_name === 'super_admin' ||
    ((user as any)?.role === 'super_admin') ||
    ((user as any)?.role === 'admin' && !resolvedSchoolId);

  useEffect(() => {
    let isActive = true;

    // Use API as primary source for non-super-admin users.
    if (!isSuperAdmin) {
      get<any>('/api/v1/school-management/my-school')
        .then((resp) => {
          if (!isActive) return;
          const apiName =
            (typeof resp?.school_name === 'string' && resp.school_name) ||
            (typeof resp?.name === 'string' && resp.name) ||
            (typeof resp?.data?.school_name === 'string' && resp.data.school_name) ||
            (typeof resp?.data?.name === 'string' && resp.data.name) ||
            '';
          setFetchedSchoolName(apiName);
        })
        .catch(() => {
          if (!isActive) return;
          setFetchedSchoolName('');
        });
    } else {
      setFetchedSchoolName('');
    }

    return () => {
      isActive = false;
    };
  }, [isSuperAdmin]);

  const schoolName = fetchedSchoolName || schoolNameFromProfile;

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.border, paddingTop: insets.top, height: 60 + insets.top }]}>
        {/* Left Section: Logo + School Name */}
        <View style={styles.headerLeft}>
          <AppSideNavMenuButton color={theme.colors.text} style={styles.menuButton} />
          <TouchableOpacity
            style={styles.logoTouch}
            onPress={() => navigateToAppMainTab(APP_MAIN_TABS.DASHBOARD)}
            accessibilityRole="button"
            accessibilityLabel="Go to main dashboard"
          >
            <Image
              source={
                isDark
                  ? require('../../../../assets/eduvijna_logo_sidebar_white.png')
                  : require('../../../../assets/eduvijna_logo_sidebar.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {!!schoolName && (
            <View style={[styles.schoolBadge, { backgroundColor: theme.colors.primary + '14', borderColor: theme.colors.primary + '40' }]}>
              <Text style={[styles.schoolName, { color: theme.colors.primary }]} numberOfLines={1}>
                {schoolName}
              </Text>
            </View>
          )}
        </View>

        {/* Right Section: Create Assessment, Notifications & Profile */}
        <View style={styles.headerRight}>
          {(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'student') && (
            <TouchableOpacity 
              style={styles.createAssessmentButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.avatar_url ? (
              <Image 
                source={{ uri: user.avatar_url }} 
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={24} color={theme.colors.buttonText} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        navigation={navigation}
        theme={theme}
        isDark={isDark}
      />
    </>
  );
}

export default function MobileNavigation() {
  const { theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        header: () => <CustomHeader />,
        headerStyle: {
          backgroundColor: theme.colors.cardBackground,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          color: theme.colors.text,
        },
      }}
      initialRouteName="Main"
    >
      <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Assessments"
        component={RoleAssessments}
        options={{
          headerShown: true,
          title: 'Assessments',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="StudentList" 
        component={StudentList}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'All Students',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="ClassesList" 
        component={ClassesList}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'My Classes',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="CreateAIQuizScreen" 
        component={CreateAIQuizScreen}
        options={({ navigation: screenNav }) => ({
          headerShown: true,
          presentation: 'modal',
          title: 'Create AI Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => screenNav.navigate('RecentAssessmentsScreen')}
              style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>Recent</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="AssessmentWorkspaceScreen"
        component={AssessmentWorkspaceScreen}
        options={({ route }) => {
          const mode = (route?.params as any)?.mode;
          return {
            headerShown: true,
            presentation: 'modal',
            title: mode === 'handwritten' ? 'Handwritten Workspace' : 'Document Workspace',
            headerBackTitle: 'Back',
          };
        }}
      />
      <Stack.Screen 
        name="CreateDocumentQuizScreen" 
        component={CreateDocumentQuizScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Document Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="document-text" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
          ),
        }}
      />
      <Stack.Screen 
        name="CreateImageQuizScreen" 
        component={CreateImageQuizScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Create Image Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="image" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
          ),
        }}
      />
      <Stack.Screen 
        name="CreateYouTubeQuizScreen" 
        component={CreateYouTubeQuizScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'YouTube Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="logo-youtube" size={24} color="#FF0000" style={{ marginRight: 16 }} />
          ),
        }}
      />
      <Stack.Screen 
        name="CreateWebsiteQuizScreen" 
        component={CreateWebsiteQuizScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Create Website Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="globe" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
          ),
        }}
      />
      <Stack.Screen 
        name="CreateHandwrittenQuizScreen" 
        component={CreateHandwrittenQuizScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Handwritten Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="create" size={24} color="#7C3AED" style={{ marginRight: 16 }} />
          ),
        }}
      />
      <Stack.Screen 
        name="QuizTakingScreen" 
        component={QuizTakingScreen}
        options={({ navigation, route }) => {
          const routeParams: any = route?.params;
          const isDocumentFlow = routeParams?.source === 'document';

          if (isDocumentFlow) {
            return {
              headerShown: true,
              presentation: 'card',
              title: 'Document Assessment',
              headerBackTitle: 'Back',
              headerRight: () => (
                <Ionicons name="document-text" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
              ),
            };
          }

          return {
            headerShown: true,
            presentation: 'card',
            title: 'Taking Assessment',
            headerBackTitle: 'Dashboard',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => {
                  navigation.navigate('Main', { screen: 'Dashboard' });
                }}
                style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity onPress={() => {
                navigation.navigate('Main', { screen: 'Dashboard' });
              }} style={{ marginRight: 16 }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            ),
          };
        }}
      />
      <Stack.Screen 
        name="QuizResultsScreen" 
        component={QuizResultsScreen}
        options={{
          headerShown: true,
          presentation: 'card',
          title: 'Assessment Results',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="QuizPreviewScreen" 
        component={QuizPreviewScreen}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Assessment Preview',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="StudentAnalytics" 
        component={StudentAnalyticsScreen}
        options={{
          headerShown: true,
          presentation: 'card',
          title: 'Student Analytics',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="TestNotifications" 
        component={TestNotifications}
        options={{
          headerShown: true,
          presentation: 'card',
          title: '🔔 Test Push Notifications',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen 
        name="QuizStatusScreen" 
        component={QuizStatusScreen as any}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Quiz Status',
          headerBackTitle: 'Dashboard',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                navigation.navigate('Main', { screen: 'Dashboard' });
              }}
              style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen 
        name="QuizLoadingScreen" 
        component={QuizLoadingScreen as any}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="RecentAssessmentsScreen"
        component={RecentAssessmentsScreen as any}
        options={{
          headerShown: true,
          title: 'Recent Assessments',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="WorksheetScreen"
        component={WorksheetScreen as any}
        options={{
          headerShown: true,
          title: 'Worksheet',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DocumentUploadHomeScreen"
        component={DocumentUploadHomeScreen as any}
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Document & Handwritten',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DocumentUploadPreviewScreen"
        component={DocumentUploadPreviewScreen as any}
        options={{
          headerShown: true,
          title: 'Preview',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DocumentUploadHistoryScreen"
        component={DocumentUploadHistoryScreen as any}
        options={{
          headerShown: true,
          title: 'History',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="DocumentUploadQuizScreen"
        component={DocumentUploadQuizScreen as any}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function BottomTabNavigator() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);

  /**
   * Check if we should show push notification prompt after login
   */
  useEffect(() => {
    const checkPushPrompt = async () => {
      if (!user) {
        setShowPushPrompt(false);
        return;
      }

      try {
        // Sync push status after login
        await PushNotificationService.syncStatusAfterLogin();

        // Check if push is enabled
        const status = await PushNotificationService.getPushStatus();
        
        // Check if prompt was recently dismissed
        const recentlyDismissed = await PushNotificationService.wasPromptRecentlyDismissed();

        // Show prompt if: push not enabled, supported, and not recently dismissed
        if (!status.isEnabled && status.isSupported && !recentlyDismissed) {
          // Small delay to let user see the main screen first
          setTimeout(() => {
            setShowPushPrompt(true);
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking push prompt:', error);
      }
    };

    checkPushPrompt();
  }, [user]);

  /**
   * Handle user clicking "Enable" on push prompt
   */
  const handleEnablePush = async () => {
    setPromptLoading(true);
    
    try {
      const result = await PushNotificationService.enablePushNotifications();
      
      if (result.success) {
        setShowPushPrompt(false);
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error: any) {
      console.error('Error enabling push:', error);
      Alert.alert('Error', 'Failed to enable push notifications');
    } finally {
      setPromptLoading(false);
    }
  };

  /**
   * Handle user clicking "Later" on push prompt
   */
  const handleDismissPushPrompt = async () => {
    await PushNotificationService.dismissPrompt();
    setShowPushPrompt(false);
  };

  return (
    <>
    {/* Global notification handler - listens for notification taps */}
    <NotificationHandler />
    
    <Tab.Navigator
      initialRouteName="Dashboard"
      backBehavior="initialRoute"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Assessments') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'ERP') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'ERPSchools') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Theme') {
            iconName = focused ? 'color-palette' : 'color-palette-outline';
          } else {
            
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        header: () => <CustomHeader />,
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          backgroundColor: theme.colors.cardBackground,
          borderTopColor: theme.colors.border,
        },
      })}
    >
      <Tab.Screen
        name="Analytics"
        component={ClassesList}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="Assessments"
        component={RoleAssessments}
        options={{ title: 'Assessments' }}
      />
      <Tab.Screen
        name="Dashboard"
        component={RoleDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="ERP"
        component={ERPNavigator}
        options={{ title: 'ERP' }}
      />
      {user?.role === 'instructor' && (
        <Tab.Screen
          name="ERPSchools"
          component={SchoolsTabEntry}
          options={{
            title: 'Schools',
            tabBarStyle: { display: 'none' },
          }}
        />
      )}
      {/* <Tab.Screen 
        name="Theme" 
        component={ThemeSettingsScreen}
        options={{ title: 'Theme' }}
      /> */}
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          title: 'Notifications',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Profile',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>

    {/* Push Notification Prompt */}
    <PushNotificationPrompt
      visible={showPushPrompt}
      onEnable={handleEnablePush}
      onDismiss={handleDismissPushPrompt}
      loading={promptLoading}
    />
  </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingLeft: 6,
    paddingRight: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  menuButton: {
    marginLeft: -2,
    marginRight: 0,
  },
  logoTouch: {
    marginRight: 6,
  },
  logo: {
    width: 108,
    height: 40,
  },
  schoolBadge: {
    maxWidth: 130,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  schoolName: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 1,
  },
  profileButton: {
    padding: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
    createAssessmentButton: {
    padding: 8,
  },
});
