/**
 * HEADER INTEGRATION EXAMPLE
 * 
 * This example shows how to integrate the Header component in your app
 * to make the "+ Create" button visible across all screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Header from '../core/components/Header';
import TeacherDashboard from '../screens/TeacherDashboard';
import StudentDashboard from '../screens/StudentDashboard';
import Assessments from '../screens/Assessments';
import CreateAIQuizScreen from '../screens/CreateAIQuizScreen';
import CreateDocumentQuizScreen from '../screens/CreateDocumentQuizScreen';
import CreateImageQuizScreen from '../screens/CreateImageQuizScreen';
import CreateWebsiteQuizScreen from '../screens/CreateWebsiteQuizScreen';
import CreateYouTubeQuizScreen from '../screens/CreateYouTubeQuizScreen';

const Stack = createNativeStackNavigator();

/**
 * METHOD 1: Custom Header for All Screens (RECOMMENDED)
 * Shows the Header component with Create button on all screens
 */
export function AppNavigatorWithCustomHeader() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          header: () => (
            <Header
              navigation={navigation}
              onNotificationPress={() => {
                navigation.navigate('Notifications');
              }}
              onProfilePress={() => {
                navigation.navigate('Profile');
              }}
              showCreateButton={true} // Show create button
            />
          ),
        })}
      >
        <Stack.Screen 
          name="TeacherDashboard" 
          component={TeacherDashboard}
        />
        <Stack.Screen 
          name="StudentDashboard" 
          component={StudentDashboard}
        />
        <Stack.Screen 
          name="Assessments" 
          component={Assessments}
          initialParams={{ userRole: 'teacher' }}
        />
        <Stack.Screen 
          name="CreateAIQuizScreen" 
          component={CreateAIQuizScreen}
        />
        <Stack.Screen 
          name="CreateDocumentQuizScreen" 
          component={CreateDocumentQuizScreen}
        />
        <Stack.Screen 
          name="CreateImageQuizScreen" 
          component={CreateImageQuizScreen}
        />
        <Stack.Screen 
          name="CreateWebsiteQuizScreen" 
          component={CreateWebsiteQuizScreen}
        />
        <Stack.Screen 
          name="CreateYouTubeQuizScreen" 
          component={CreateYouTubeQuizScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * METHOD 2: Role-Based Header Display
 * Only shows Create button for teachers
 */
export function AppNavigatorWithRoleBasedHeader() {
  const [userRole, setUserRole] = React.useState<'teacher' | 'student'>('teacher');

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={({ navigation }) => ({
          header: () => (
            <Header
              navigation={navigation}
              onNotificationPress={() => {
                navigation.navigate('Notifications');
              }}
              onProfilePress={() => {
                navigation.navigate('Profile');
              }}
              // Create button only shows for teachers automatically
              showCreateButton={true}
            />
          ),
        })}
      >
        {userRole === 'teacher' ? (
          <Stack.Screen 
            name="TeacherDashboard" 
            component={TeacherDashboard}
          />
        ) : (
          <Stack.Screen 
            name="StudentDashboard" 
            component={StudentDashboard}
          />
        )}
        
        {/* Other screens */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * METHOD 3: Selective Header for Specific Screens
 * Show Header on some screens, hide on others
 */
export function AppNavigatorWithSelectiveHeader() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Dashboard screens WITH header */}
        <Stack.Screen 
          name="TeacherDashboard" 
          component={TeacherDashboard}
          options={({ navigation }) => ({
            header: () => (
              <Header
                navigation={navigation}
                onNotificationPress={() => navigation.navigate('Notifications')}
                onProfilePress={() => navigation.navigate('Profile')}
                showCreateButton={true}
              />
            ),
          })}
        />

        {/* Create screens WITHOUT custom header (use default) */}
        <Stack.Screen 
          name="CreateAIQuizScreen" 
          component={CreateAIQuizScreen}
          options={{
            title: 'Create AI Quiz',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * METHOD 4: Using Header Inside Screen Components
 * If you can't modify navigation structure, add Header directly in screens
 */
export function DashboardScreenWithIntegratedHeader({ navigation }: any) {
  return (
    <>
      {/* Add Header at the top of screen */}
      <Header
        navigation={navigation}
        onNotificationPress={() => navigation.navigate('Notifications')}
        onProfilePress={() => navigation.navigate('Profile')}
        showCreateButton={true}
      />
      
      {/* Your dashboard content */}
      <TeacherDashboard navigation={navigation} />
    </>
  );
}

/**
 * COMPLETE NAVIGATION SETUP EXAMPLE
 * Full working example with all routes
 */
export function CompleteAppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={({ navigation, route }) => {
          // Hide custom header on login/auth screens
          const authScreens = ['Login', 'Register', 'ForgotPassword'];
          const isAuthScreen = authScreens.includes(route.name);

          if (isAuthScreen) {
            return { headerShown: false };
          }

          // Show custom header on all other screens
          return {
            header: () => (
              <Header
                navigation={navigation}
                onNotificationPress={() => navigation.navigate('Notifications')}
                onProfilePress={() => navigation.navigate('Profile')}
                showCreateButton={true}
              />
            ),
          };
        }}
      >
        {/* Auth Screens (No Header) */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
        />

        {/* Dashboard Screens (With Header) */}
        <Stack.Screen 
          name="TeacherDashboard" 
          component={TeacherDashboard}
        />
        <Stack.Screen 
          name="StudentDashboard" 
          component={StudentDashboard}
        />

        {/* Assessment Screens */}
        <Stack.Screen 
          name="Assessments" 
          component={Assessments}
          initialParams={{ userRole: 'teacher' }}
        />

        {/* Create Quiz Screens */}
        <Stack.Screen 
          name="CreateAIQuizScreen" 
          component={CreateAIQuizScreen}
        />
        <Stack.Screen 
          name="CreateDocumentQuizScreen" 
          component={CreateDocumentQuizScreen}
        />
        <Stack.Screen 
          name="CreateImageQuizScreen" 
          component={CreateImageQuizScreen}
        />
        <Stack.Screen 
          name="CreateWebsiteQuizScreen" 
          component={CreateWebsiteQuizScreen}
        />
        <Stack.Screen 
          name="CreateYouTubeQuizScreen" 
          component={CreateYouTubeQuizScreen}
        />

        {/* Other Screens */}
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * TROUBLESHOOTING: Why isn't the Create button showing?
 * 
 * 1. Check user role:
 *    - The "+ Create" button only shows for teachers (user.role === 'instructor')
 *    - Make sure useAuth() hook is returning the correct user role
 * 
 * 2. Check showCreateButton prop:
 *    - Default is true, but make sure you're not setting it to false
 *    <Header showCreateButton={true} /> // Explicitly set to true
 * 
 * 3. Check if Header is actually being rendered:
 *    - Add console.log in Header component to verify it's mounting
 *    - Check if header is hidden by navigation options
 * 
 * 4. Check navigation setup:
 *    - Header needs navigation prop to work
 *    - Either pass navigation prop OR use onNavigate callback
 * 
 * 5. Check imports:
 *    import Header from './core/components/Header'; // Correct path
 */

/**
 * QUICK FIX: If Header is not showing at all
 */
export function QuickFixNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // Force custom header on all screens
          headerShown: true,
          header: ({ navigation }) => (
            <Header
              navigation={navigation}
              onNotificationPress={() => console.log('Notifications')}
              onProfilePress={() => console.log('Profile')}
              showCreateButton={true}
            />
          ),
        }}
      >
        <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
        <Stack.Screen name="CreateAIQuizScreen" component={CreateAIQuizScreen} />
        {/* Add all your screens here */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * DEBUGGING CHECKLIST:
 * 
 * ✓ Is Header component imported correctly?
 * ✓ Is navigation prop passed to Header?
 * ✓ Is user.role === 'instructor' for teachers?
 * ✓ Is showCreateButton set to true?
 * ✓ Are Create quiz screens added to navigation?
 * ✓ Check console for any errors
 * ✓ Verify Header is actually rendering (add console.log)
 */

// Placeholder components for example
const LoginScreen = () => null;
const RegisterScreen = () => null;
const NotificationsScreen = () => null;
const ProfileScreen = () => null;
