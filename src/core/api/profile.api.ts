/**
 * Profile API
 * Handles user profile-related API calls
 */

import { get, put } from './config';
import type { UserProfile } from '../types/dashboard.types';

/**
 * Update profile request payload
 */
export interface UpdateProfileRequest {
  full_name?: string;
  username?: string;
  email?: string;
  bio?: string;
  phone?: string;
  address?: string;
  school?: string;
  date_of_birth?: string;
}

/**
 * Get current user profile
 * GET /api/v1/auth/profile
 */
export async function getUserProfile(): Promise<UserProfile> {
  const response = await get<UserProfile>('/api/v1/auth/profile');
  
  // Ensure name is populated
  return {
    ...response,
    name: response.full_name || response.username,
  };
}

/**
 * Update user profile
 * PUT /api/v1/auth/profile
 */
export async function updateUserProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const response = await put<UserProfile>('/api/v1/auth/profile', data);
  
  // Ensure name is populated
  return {
    ...response,
    name: response.full_name || response.username,
  };
}
