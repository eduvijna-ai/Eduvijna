/**
 * SETUP GUIDE: Authentication Error Handling with Login Redirect
 * 
 * This guide shows how to setup automatic login redirect when authentication fails
 */

import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { setAuthErrorNavigationCallback, AuthenticationError } from '@core/services/dashboardApi';
import { useAuthErrorHandler } from '@core/hooks/useAuthErrorHandler';
import { fetchTeacherDashboardSummary } from '@core/services/dashboardApi';
import * as TokenStorage from '@core/services/tokenStorage';

const Stack = createNativeStackNavigator();

/**
 * METHOD 1: Using the custom hook (RECOMMENDED)
 * Add this hook to your root navigator component
 */
function AppNavigator() {
  // This hook sets up automatic login redirect on auth failures
  useAuthErrorHandler();

  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Dashboard" component={DashboardWithErrorHandling} />
      {/* ... other screens ... */}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}

/**
 * METHOD 2: Manual setup in App component
 * Set the callback manually if you prefer
 */
function AppWithManualSetup() {
  const navigationRef = React.useRef<any>(null);

  useEffect(() => {
    // Setup global auth error handler
    setAuthErrorNavigationCallback(() => {
      console.log('🔄 Auth failed - redirecting to login');
      
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    });
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardWithErrorHandling} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * METHOD 3: Handling AuthenticationError in components
 * You can also catch the error in individual components
 */
function DashboardWithErrorHandling() {
  const navigation = useNavigation<any>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await fetchTeacherDashboardSummary();
      setData(response.data);
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        // Authentication failed - tokens are already cleared
        // Navigate to login
        console.log('⚠️ Auth error caught in component');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        // Other errors
        setError(err?.message || 'An error occurred');
        console.error('Dashboard load failed:', err);
      }
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#EF4444', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity
          onPress={loadDashboard}
          style={{ backgroundColor: '#5B21B6', padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#FFFFFF' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{data ? 'Dashboard Loaded' : 'Loading...'}</Text>
    </View>
  );
}

/**
 * METHOD 4: Web-specific handling
 * For web apps, you can redirect to a URL
 */
function WebApp() {
  useEffect(() => {
    setAuthErrorNavigationCallback(() => {
      console.log('🔄 Auth failed - redirecting to /login');
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/login';
      }
    });
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Text>Your Web App Content</Text>
    </View>
  );
}

// Placeholder for login function
async function loginUser(email: string, password: string) {
  // This would be your actual login API call
  const response = await fetch('https://eduapi.eduvijna.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  return response.json();
}

/**
 * EXAMPLE: Login Screen
 */
function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Your login logic here
      const response = await loginUser(email, password);
      
      // Save tokens
      await TokenStorage.setAccessToken(response.access_token);
      await TokenStorage.setRefreshToken(response.refresh_token);
      
      // Navigate to dashboard
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Login
      </Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          borderColor: '#E5E7EB',
          padding: 12,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />
      
      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{
          backgroundColor: '#5B21B6',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Login
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

/**
 * AUTHENTICATION FLOW:
 * 
 * 1. User logs in → Tokens saved to storage
 * 2. User makes API calls → Token sent in Authorization header
 * 3. If token invalid/expired → API returns 401
 * 4. handleAuthError detects 401 → Clears tokens
 * 5. Navigation callback called → User redirected to Login
 * 6. User logs in again → New tokens saved
 * 7. Process repeats
 * 
 * 
 * ERROR TYPES THAT TRIGGER REDIRECT:
 * - Status code 401 (Unauthorized)
 * - Status code 403 (Forbidden)
 * - Error message contains "authentication failed"
 * - Error message contains "invalid or missing jwt token"
 * - Error message contains "user id not available"
 * 
 * 
 * WHAT HAPPENS ON AUTH ERROR:
 * 1. Error logged to console with clear formatting
 * 2. All tokens cleared from storage (clearAuthData())
 * 3. Navigation callback called (if set)
 * 4. AuthenticationError thrown for component-level handling
 * 5. User sees login screen
 * 
 * 
 * BEST PRACTICES:
 * - Set navigation callback once in root component
 * - Use navigation.reset() to clear navigation stack
 * - Don't show error messages for auth failures (just redirect)
 * - Clear any cached user data when redirecting to login
 * - Consider showing a brief toast: "Session expired. Please login again."
 */

/**
 * DEBUGGING AUTH ERRORS:
 * 
 * If you see "Cannot read property 'reload' of undefined":
 * - This means you're in React Native and didn't set navigation callback
 * - Solution: Use useAuthErrorHandler() hook or setAuthErrorNavigationCallback()
 * 
 * If you keep getting 401 errors:
 * - Check if tokens are being saved correctly after login
 * - Verify TokenStorage.getAccessToken() returns valid token
 * - Check if token is expired (verify expiry time)
 * - Ensure Authorization header format: "Bearer <token>"
 * 
 * If redirect doesn't work:
 * - Verify navigation callback is set before any API calls
 * - Check navigation screen name matches your routes ('Login')
 * - Ensure NavigationContainer is properly setup
 */
