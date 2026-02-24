/**
 * Mobile Login Screen
 * Platform: React Native (iOS/Android)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function Login() {
  const { login, isLoading, error, clearError } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    clearError();
    
    try {
      await login({ email: email.trim(), password });
    } catch (e: any) {
      // Error is handled by the useAuth hook
      console.log('Login error:', e);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={require('../../../../assets/eduvijna.png')} style={styles.logo} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput 
        placeholder="Email or Username" 
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]} 
        value={email} 
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoading}
      />
      
      <TextInput 
        placeholder="Password" 
        placeholderTextColor={colors.textSecondary}
        secureTextEntry 
        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]} 
        value={password} 
        onChangeText={setPassword}
        autoCapitalize="none"
        editable={!isLoading}
      />
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: colors.primary }, isLoading && styles.buttonDisabled]} 
        onPress={onLogin} 
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingSpinner size={24} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 16 
  },
  logo: { 
    width: 150, 
    height: 120, 
    marginBottom: 12,
  },
  input: { 
    width: '100%', 
    padding: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderRadius: 8, 
  },
  error: { 
    color: '#DC2626', 
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

