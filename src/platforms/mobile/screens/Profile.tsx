/**
 * Mobile Profile Screen - Modern Redesign
 * User profile view and edit screen with avatar, personal info, and settings
 * Platform: React Native (iOS/Android)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import { getUserProfile, updateUserProfile, type UpdateProfileRequest } from '@core/api/profile.api';
import PushNotificationService from '@core/services/PushNotificationService';

export default function Profile({ navigation }: any) {
  const { user: authUser, logout } = useAuth();
  const { theme, isDark } = useTheme();
  const colors = theme.colors;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pushToggleLoading, setPushToggleLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    id: authUser?.id || '',
    full_name: authUser?.full_name || '',
    username: authUser?.username || '',
    email: authUser?.email || '',
    role: authUser?.role || 'student',
    bio: '',
    phone: '',
    address: '',
    school: '',
    avatar_url: '',
    isActive: true,
    isVerified: false,
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      theme: 'light',
    },
  });

  const [originalData, setOriginalData] = useState({ ...formData });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profileData = await getUserProfile();
      
      // Get current push notification status
      const pushStatus = await PushNotificationService.getPushStatus();
      
      const updatedProfileData = {
        id: profileData.id,
        full_name: profileData.full_name || '',
        username: profileData.username,
        email: profileData.email,
        role: profileData.role,
        bio: profileData.bio || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        school: profileData.school || '',
        avatar_url: profileData.avatar_url || '',
        isActive: true,
        isVerified: false,
        preferences: {
          emailNotifications: true,
          pushNotifications: pushStatus.isEnabled,
          theme: 'light',
        },
      };
      
      setFormData(updatedProfileData);
      setOriginalData(updatedProfileData);
    } catch (error: any) {
      console.error('❌ Failed to load profile:', error);
      
      // Fallback to auth user data
      if (authUser) {
        const pushStatus = await PushNotificationService.getPushStatus();
        
        const fallbackData = {
          id: authUser.id,
          full_name: authUser.full_name || '',
          username: authUser.username || '',
          email: authUser.email || '',
          role: authUser.role || 'student',
          bio: authUser.bio || '',
          phone: authUser.phone || '',
          address: authUser.address || '',
          school: authUser.school || '',
          avatar_url: authUser.avatar_url || '',
          isActive: true,
          isVerified: false,
          preferences: {
            emailNotifications: true,
            pushNotifications: pushStatus.isEnabled,
            theme: 'light',
          },
        };
        setFormData(fallbackData);
        setOriginalData(fallbackData);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatePayload: UpdateProfileRequest = {
        full_name: formData.full_name,
        username: formData.username,
        email: formData.email,
        bio: formData.bio,
        phone: formData.phone,
        address: formData.address,
        school: formData.school,
      };
      
      const updatedProfile = await updateUserProfile(updatePayload);
      const mergedData = {
        ...formData,
        full_name: updatedProfile.full_name || formData.full_name,
        username: updatedProfile.username || formData.username,
        email: updatedProfile.email || formData.email,
        bio: updatedProfile.bio || formData.bio,
        phone: updatedProfile.phone || formData.phone,
        address: updatedProfile.address || formData.address,
        school: updatedProfile.school || formData.school,
      };
      setFormData(mergedData);
      setOriginalData(mergedData);
      
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePushNotificationToggle = async (enable: boolean) => {
    setPushToggleLoading(true);

    try {
      if (enable) {
        const result = await PushNotificationService.enablePushNotifications();
        
        if (result.success) {
          // Generate FCM/Native Device Token (silently)
          try {
            const fcmToken = (await Notifications.getDevicePushTokenAsync()).data;
            console.log('🔥 FCM Token Generated!');
            
            // Store FCM token in AsyncStorage
            await AsyncStorage.setItem('fcmDeviceToken', fcmToken);
          } catch (fcmError) {
            console.warn('Could not generate FCM token:', fcmError);
          }
          
          // Simple success message
          Alert.alert('Success', 'Push notifications enabled successfully!');
          
          setFormData(prev => ({
            ...prev,
            preferences: {
              ...prev.preferences,
              pushNotifications: true,
            },
          }));
        } else {
          Alert.alert('Error', result.message);
        }
      } else {
        const result = await PushNotificationService.disablePushNotifications();
        
        if (result.success) {
          setFormData(prev => ({
            ...prev,
            preferences: {
              ...prev.preferences,
              pushNotifications: false,
            },
          }));
          
          Alert.alert('Success', result.message);
        } else {
          Alert.alert('Error', result.message);
        }
      }
    } catch (error: any) {
      console.error('Error toggling push notifications:', error);
      Alert.alert('Error', 'Failed to update push notification settings');
    } finally {
      setPushToggleLoading(false);
    }
  };

  // Debug: Copy push tokens to clipboard
  const handleCopyPushToken = async () => {
    try {
      const expoToken = await AsyncStorage.getItem('expoPushToken');
      const fcmToken = await AsyncStorage.getItem('fcmDeviceToken');
      
      if (!expoToken && !fcmToken) {
        Alert.alert('No Token', 'Push tokens not found. Please enable push notifications first.');
        return;
      }

      const tokenInfo = [
        expoToken ? `📱 Expo Token:\n${expoToken}` : '',
        fcmToken ? `🔥 FCM Token:\n${fcmToken}` : '',
      ].filter(Boolean).join('\n\n');

      console.log('📱 Expo Push Token:', expoToken);
      console.log('🔥 FCM Device Token:', fcmToken);
      
      const alertButtons = [];
      
      if (expoToken) {
        alertButtons.push({
          text: '📱 Expo Token',
          onPress: async () => {
            await Clipboard.setStringAsync(expoToken);
            Alert.alert('Copied!', `Expo token copied:\n\n${expoToken.substring(0, 50)}...`);
          }
        });
      }
      
      if (fcmToken) {
        alertButtons.push({
          text: '🔥 FCM Token',
          onPress: async () => {
            await Clipboard.setStringAsync(fcmToken);
            Alert.alert('Copied!', `FCM token copied:\n\n${fcmToken.substring(0, 50)}...`);
          }
        });
      }
      
      alertButtons.push(
        {
          text: 'View Both',
          onPress: () => Alert.alert('Push Tokens', tokenInfo)
        },
        { text: 'Cancel', style: 'cancel' as const }
      );
      
      Alert.alert(
        '✅ Select Token to Copy',
        'Choose which token to copy:',
        alertButtons
      );
    } catch (error) {
      console.error('Error copying token:', error);
      Alert.alert('Error', 'Failed to copy push token');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'teacher':
      case 'instructor':
        return '👨‍🏫';
      case 'student':
        return '🎓';
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner size={60} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="warning" size={48} color="#F44336" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account</Text>
            <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, { backgroundColor: colors.inputBackground }]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  Alert.alert('Feature Not Implemented', 'Account deletion is not yet available.');
                }}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header with Gradient Background */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            {!isEditing ? (
              <>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.editProfileText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>

          <View style={[styles.profileCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.avatarWrapper}>
              {formData.avatar_url ? (
                <Image source={{ uri: formData.avatar_url }} style={[styles.avatar, { borderColor: colors.border }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary, borderColor: colors.border }]}>
                  <Text style={styles.avatarText}>
                    {formData.full_name?.charAt(0)?.toUpperCase() || formData.username?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50', borderColor: colors.cardBackground }]} />
            </View>

            <Text style={[styles.userName, { color: colors.text }]}>{formData.full_name || formData.username || 'User'}</Text>

            <View style={[styles.roleChip, { backgroundColor: isDark ? colors.primary + '20' : '#E8F4F8' }]}>
              <Text style={styles.roleIcon}>{getRoleIcon(formData.role)}</Text>
              <Text style={[styles.roleText, { color: colors.primary }]}>{formData.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {isEditing && (
        <View style={[styles.actionButtonsContainer, { backgroundColor: colors.inputBackground }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <LoadingSpinner size={20} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Personal Information Card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
          <Ionicons name="person-outline" size={22} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.full_name}
                onChangeText={(value) => updateFormData('full_name', value)}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.full_name || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="at" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.username}
                onChangeText={(value) => updateFormData('username', value)}
                placeholder="Username"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Username</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.username || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.email || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                placeholder="Phone"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.phone || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="school-outline" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.school}
                onChangeText={(value) => updateFormData('school', value)}
                placeholder="School"
                placeholderTextColor={colors.textSecondary}
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>School</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.school || 'Not set'}</Text>
              </View>
            )}
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            {isEditing ? (
              <TextInput
                style={[styles.inlineInput, { minHeight: 60, color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                value={formData.address}
                onChangeText={(value) => updateFormData('address', value)}
                placeholder="Address"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
              />
            ) : (
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Address</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{formData.address || 'Not set'}</Text>
              </View>
            )}
          </View>
        </View>

        {isEditing && (
          <View style={[styles.bioSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.bioLabel, { color: colors.textSecondary }]}>
              <Ionicons name="document-text" size={16} color={colors.textSecondary} /> Bio
            </Text>
            <TextInput
              style={[styles.bioInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              value={formData.bio}
              onChangeText={(value) => updateFormData('bio', value)}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        )}

        {!isEditing && formData.bio && (
          <View style={[styles.bioDisplay, { borderTopColor: colors.border }]}>
            <Ionicons name="document-text" size={18} color={colors.textSecondary} />
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{formData.bio}</Text>
          </View>
        )}
      </View>

      {/* Preferences Card - Only in View Mode */}
      {!isEditing && (
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Preferences</Text>
          </View>

          <View style={styles.preferencesList}>
            {/* Push Notifications */}
            <View style={[styles.preferenceItem, { backgroundColor: colors.inputBackground }]}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.preferenceIconCircle, { backgroundColor: isDark ? colors.primary + '20' : '#E8F4F8' }]}>
                  <Ionicons name="notifications" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.preferenceLabel, { color: colors.text }]}>Push Notifications</Text>
                  <Text style={[styles.preferenceSubtext, { color: colors.textSecondary }]}>Real-time alerts</Text>
                  {!PushNotificationService.isPushSupported() && (
                    <Text style={[styles.preferenceSubtext, { color: '#DC2626', fontSize: 10, marginTop: 2 }]}>
                      Not supported on this device
                    </Text>
                  )}
                </View>
              </View>
              {pushToggleLoading ? (
                <LoadingSpinner size={20} />
              ) : (
                <Switch
                  value={formData.preferences?.pushNotifications ?? false}
                  onValueChange={handlePushNotificationToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                  disabled={!PushNotificationService.isPushSupported()}
                />
              )}
            </View>

            {/* Debug: Copy Push Tokens */}
            {/* {formData.preferences?.pushNotifications && (
              <TouchableOpacity 
                style={styles.debugButton}
                onPress={handleCopyPushToken}
              >
                <Ionicons name="copy-outline" size={16} color="#059669" />
                <Text style={styles.debugButtonText}>📋 Copy Push Tokens (Expo + FCM)</Text>
              </TouchableOpacity>
            )} */}

            {/* Test Notifications */}
            {/* <TouchableOpacity 
              style={styles.testNotificationButton}
              onPress={() => navigation?.navigate?.('TestNotifications')}
            >
              <Ionicons name="flask" size={16} color="#3B82F6" />
              <Text style={styles.testNotificationText}>🔬 Test Push Notifications</Text>
            </TouchableOpacity> */}

            {/* Theme Setting */}
            {/* <TouchableOpacity 
              style={styles.preferenceItem}
              onPress={() => navigation?.navigate?.('ThemeSettings')}
            >
              <View style={styles.preferenceLeft}>
                <View style={styles.preferenceIconCircle}>
                  <Ionicons name="color-palette" size={18} color="#1B4F5C" />
                </View>
                <View>
                  <Text style={styles.preferenceLabel}>Theme</Text>
                  <Text style={styles.preferenceSubtext}>App appearance</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.themeValue}>Light</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </TouchableOpacity> */}
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  header: {
    padding: 15,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 5,
    marginTop: 5,
  },
  headerContent: {
    paddingHorizontal: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginBottom: 30,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  profileCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: -25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  roleIcon: {
    fontSize: 14,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveButton: {
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  inlineInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  bioSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  bioInput: {
    fontSize: 13,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  bioDisplay: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bioText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  preferencesList: {
    gap: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  preferenceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 1,
  },
  preferenceSubtext: {
    fontSize: 11,
  },
  themeValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    borderStyle: 'dashed',
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  testNotificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalDeleteButton: {
    backgroundColor: '#F44336',
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 16,
  },
});
