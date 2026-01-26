/**
 * CACHE CLEARING ON LOGOUT - Example Implementation
 * 
 * This example shows how to properly clear the API cache when a user logs out
 * to prevent data leakage and ensure fresh data for the next user.
 * 
 * IMPORTANT: Always clear the cache on logout to prevent security issues!
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { clearApiCache } from '../core/services/dashboardApi';
import { TokenStorage } from '../core/services/storage';

/**
 * METHOD 1: Simple Logout with Cache Clear
 * Basic implementation for most use cases
 */
export function SimpleLogoutExample({ navigation }: any) {
  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out user...');
      
      // Step 1: Clear authentication tokens
      await TokenStorage.clearAuthData();
      console.log('✅ Auth tokens cleared');
      
      // Step 2: Clear API cache to remove all cached data
      clearApiCache();
      console.log('✅ API cache cleared');
      
      // Step 3: Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      console.log('✅ Redirected to login');
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simple Logout</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * METHOD 2: Logout with Confirmation Dialog
 * Shows a confirmation before logging out
 */
export function LogoutWithConfirmation({ navigation }: any) {
  const confirmLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout? All cached data will be cleared.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: handleLogout,
        },
      ]
    );
  };

  const handleLogout = async () => {
    try {
      // Clear tokens and cache
      await TokenStorage.clearAuthData();
      clearApiCache();
      
      // Navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
  );
}

/**
 * METHOD 3: Logout with Loading State
 * Shows loading indicator during logout process
 */
export function LogoutWithLoading({ navigation }: any) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Simulate any cleanup tasks
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Clear authentication and cache
      await TokenStorage.clearAuthData();
      clearApiCache();
      
      // Navigate to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]} 
      onPress={handleLogout}
      disabled={isLoggingOut}
    >
      <Text style={styles.buttonText}>
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * METHOD 4: Reusable Logout Hook
 * Custom hook for logout functionality - USE THIS IN YOUR APP!
 */
export function useLogout() {
  const logout = async (navigation: any) => {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚪 LOGOUT INITIATED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Clear authentication tokens
      await TokenStorage.clearAuthData();
      console.log('✅ Authentication tokens cleared');
      
      // Clear API cache to prevent data leakage
      clearApiCache();
      console.log('✅ API cache cleared (all cached data removed)');
      
      // Reset navigation to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      console.log('✅ Navigation reset to Login screen');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ LOGOUT COMPLETED SUCCESSFULLY');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      return true;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ LOGOUT FAILED');
      console.error('Error:', error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw error;
    }
  };

  return { logout };
}

/**
 * USAGE EXAMPLE: Using the logout hook in a component
 */
export function ProfileScreenExample({ navigation }: any) {
  const { logout } = useLogout();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogoutPress = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout(navigation);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      {/* Other profile content */}
      
      <TouchableOpacity 
        style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
        onPress={handleLogoutPress}
        disabled={isLoggingOut}
      >
        <Text style={styles.buttonText}>
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * INTEGRATION GUIDE
 * 
 * 1. Import the logout hook in your app:
 * 
 *    import { useLogout } from './examples/CacheClearOnLogout.example';
 * 
 * 2. Use it in your Header, Profile, or Settings screen:
 * 
 *    function Header({ navigation }) {
 *      const { logout } = useLogout();
 *      
 *      return (
 *        <TouchableOpacity onPress={() => logout(navigation)}>
 *          <Text>Logout</Text>
 *        </TouchableOpacity>
 *      );
 *    }
 * 
 * 3. That's it! Cache will be automatically cleared on logout.
 */

/**
 * WHY CLEAR CACHE ON LOGOUT?
 * 
 * Security Reasons:
 * - Prevents next user from seeing previous user's data
 * - Cached data may contain sensitive information
 * - Cached data is tied to the logged-out user's token
 * 
 * Performance Reasons:
 * - Stale data won't be shown to new user
 * - Fresh data will be fetched for new user
 * - Prevents cache key conflicts
 * 
 * Data Integrity:
 * - New user should see their own data, not cached data from previous user
 * - Ensures correct authorization context
 */

/**
 * CONSOLE OUTPUT WHEN LOGOUT IS SUCCESSFUL:
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 🚪 LOGOUT INITIATED
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ✅ Authentication tokens cleared
 * ✅ API cache cleared (all cached data removed)
 * 🗑️ API cache cleared
 * ✅ Navigation reset to Login screen
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ✅ LOGOUT COMPLETED SUCCESSFULLY
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
