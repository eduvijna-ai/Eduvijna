/**
 * Web Login Screen
 * Platform: Web (React DOM)
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
import LoadingSpinner from '../../../components/LoadingSpinner';

export default function Login() {
  const { login, isLoggingIn, error, clearError } = useAuth();
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
    <View style={styles.container}>
      <Image source={require('../../../../assets/eduvijna.png')} style={styles.logo} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TextInput 
        placeholder="Email or Username" 
        style={styles.input} 
        value={email} 
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!isLoggingIn}
      />
      
      <TextInput 
        placeholder="Password" 
        secureTextEntry 
        style={styles.input} 
        value={password} 
        onChangeText={setPassword}
        autoCapitalize="none"
        editable={!isLoggingIn}
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoggingIn && styles.buttonDisabled]} 
        onPress={onLogin} 
        disabled={isLoggingIn}
      >
        {isLoggingIn ? (
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
    backgroundColor: '#FFFFFF', 
    padding: 16 
  },
  logo: { 
    width: 150, 
    height: 120, 
    marginBottom: 12,
  },
  input: { 
    width: '100%', 
    maxWidth: 400,
    padding: 12, 
    marginBottom: 8, 
    borderWidth: 1, 
    borderColor: '#D1D5DB', 
    borderRadius: 8, 
    backgroundColor: '#FFFFFF', 
    color: '#111827',
    outlineStyle: 'none',
  } as any,
  error: { 
    color: '#DC2626', 
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1B4F5C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    cursor: 'pointer',
  } as any,
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  } as any,
});
