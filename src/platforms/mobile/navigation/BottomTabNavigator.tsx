/**
 * Mobile Bottom Tab Navigation
 */

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import CreateAssessmentModal from '../../../components/CreateAssessmentModal';
import PushNotificationPrompt from '../../../components/PushNotificationPrompt';
import NotificationHandler from '../../../components/NotificationHandler';
import PushNotificationService from '@core/services/PushNotificationService';

import AssessmentsScreen from '@screens/Assessments';
import ERPNavigator from '../../../erp/navigation/ERPNavigator';
import { AcademicYearProvider } from '../../../erp/contexts/AcademicYearContext';
// import AnalyticsScreen from '../screens/Analytics';
import ProfileScreen from '../screens/Profile';
import NotificationsScreen from '@screens/Notifications';
import TeacherDashboard from '@screens/TeacherDashboard';
import StudentDashboard from '@screens/StudentDashboard';
import StudentList from '@screens/StudentList';
import ClassesList from '@screens/ClassesList';
import CreateAIQuizScreen from '@screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from '@screens/CreateDocumentQuizScreen';
import CreateImageQuizScreen from '@screens/CreateImageQuizScreen';
import CreateYouTubeQuizScreen from '@screens/CreateYouTubeQuizScreen';
import CreateWebsiteQuizScreen from '@screens/CreateWebsiteQuizScreen';
import CreateHandwrittenQuizScreen from '@screens/CreateHandwrittenQuizScreen';
import QuizTakingScreen from '@screens/QuizTakingScreen';
import QuizResultsScreen from '@screens/QuizResultsScreen';
import QuizPreviewScreen from '@screens/QuizPreviewScreen';
import StudentAnalyticsScreen from '@screens/StudentAnalyticsScreen';
import TestNotifications from '@screens/TestNotifications';
import QuizStatusScreen from '@screens/QuizStatusScreen';
import QuizLoadingScreen from '@screens/QuizLoadingScreen';

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
  const { theme, isDark, toggleTheme } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={[styles.header, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.border, paddingTop: insets.top, height: 60 + insets.top }]}>
        {/* Logo */}
        <TouchableOpacity 
            style={styles.logo}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
          >
          <Image 
            source={require('../../../../assets/eduvijna_logo_sidebar.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Right Section: Create Assessment, Theme Toggle, Notifications & Profile */}
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
        headerShown: false,
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
      <Stack.Screen name="Main" component={BottomTabNavigator} />
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
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Create AI Assessment',
          headerBackTitle: 'Back',
          headerRight: () => (
            <Ionicons name="bulb" size={24} color={theme.colors.primary} style={{ marginRight: 16 }} />
          ),
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
    </Stack.Navigator>
  );
}

function BottomTabNavigator() {
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
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
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Assessments') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Analytics') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'ERP') {
            iconName = focused ? 'business' : 'business-outline';
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
        name="Dashboard" 
        component={RoleDashboard}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Assessments" 
        component={RoleAssessments}
        options={{ title: 'Assessments' }}
      />
      <Tab.Screen 
        name="Analytics" 
        component={ClassesList}
        options={{ title: 'Analytics' }}
      />
      <Tab.Screen
        name="ERP"
        options={{ title: 'ERP' }}
      >
        {() => (
          <AcademicYearProvider>
            <ERPNavigator />
          </AcademicYearProvider>
        )}
      </Tab.Screen>
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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
