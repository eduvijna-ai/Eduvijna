# Backend API Integration - Eduvijna App

## Overview

The authentication system now uses the **exact same backend API** as the existing "G:\Eduvijna AI APP" application.

**Backend URL**: `https://api.eduvijna.com`

---

## Authentication Endpoints

### 1. Login

**Endpoint**: `POST /api/v1/auth/login`

**Request**:
```json
{
  "username_or_email": "teacher@eduvijna.com",
  "password": "securepassword123",
  "remember_me": false,
  "device_info": "React Native Mobile App"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "12",
    "username": "john_teacher",
    "name": "John Doe",
    "email": "teacher@eduvijna.com",
    "role": "instructor",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "bio": "Math teacher",
    "avatar_url": "https://...",
    "school": "Springfield High",
    "board_id": 1,
    "grade_id": 10
  }
}
```

**Implementation**: [auth.api.ts](./src/core/api/auth.api.ts#L15-L59)

---

### 2. Get Profile

**Endpoint**: `GET /api/v1/auth/profile`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "id": "12",
  "username": "john_teacher",
  "name": "John Doe",
  "email": "teacher@eduvijna.com",
  "role": "instructor",
  "full_name": "John Doe",
  "is_active": true,
  "is_verified": true,
  "created_at": "2025-01-01T00:00:00Z",
  "last_login": "2026-01-02T10:30:00Z"
}
```

**Implementation**: [auth.api.ts](./src/core/api/auth.api.ts#L61-L79)

---

### 3. Logout

**Endpoint**: `POST /api/v1/auth/logout`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Implementation**: [auth.api.ts](./src/core/api/auth.api.ts#L30-L43)

---

### 4. Refresh Token

**Endpoint**: `POST /api/v1/auth/refresh`

**Request**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Implementation**: [auth.api.ts](./src/core/api/auth.api.ts#L81-L110)

---

## Axios Configuration

### Request Interceptor

Automatically attaches JWT Bearer token to all API requests except login/register:

```typescript
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth token for login/register endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login') || 
                          config.url?.includes('/auth/register');
    
    if (!isAuthEndpoint) {
      const token = await TokenStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  }
);
```

**File**: [config.ts](./src/core/api/config.ts#L21-L40)

---

### Response Interceptor

Handles authentication errors and logout:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    
    // Handle 401 - Session expired, logout silently
    if (status === 401 && !isLoggingOut) {
      isLoggingOut = true;
      await handleAuthenticationFailure();
      setTimeout(() => { isLoggingOut = false; }, 1000);
      return Promise.reject(new Error('Session expired'));
    }
    
    // Handle 403 - Permission denied
    if (status === 403) {
      console.log('⚠️ Permission denied (403)');
      return Promise.reject(error);
    }
    
    // Handle network errors
    if (error.message === 'Network Error' || !error.response) {
      return Promise.reject(new Error('Network connection failed'));
    }
    
    // Handle 500 errors
    if (status && status >= 500) {
      return Promise.reject(new Error('Server error. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);
```

**File**: [config.ts](./src/core/api/config.ts#L42-L80)

---

## Key Differences from Generic Implementation

### ✅ Backend-Specific Changes

| Feature | Generic Implementation | Backend API Implementation |
|---------|----------------------|---------------------------|
| **Login Field** | `email` | `username_or_email` |
| **Login Payload** | `{ email, password }` | `{ username_or_email, password, remember_me, device_info }` |
| **Response Format** | `{ user, tokens: { accessToken, refreshToken } }` | `{ user, access_token, refresh_token }` |
| **Profile Endpoint** | `/auth/me` | `/api/v1/auth/profile` |
| **Logout Endpoint** | `/auth/logout` | `/api/v1/auth/logout` |
| **User Role Types** | `'teacher' \| 'student'` | `'student' \| 'instructor' \| 'admin'` |
| **Token Header** | `Bearer <token>` | `Bearer <token>` ✅ Same |
| **Timeout** | 5 seconds | 30 seconds (matches existing app) |

---

## User Data Model

```typescript
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  full_name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  school?: string;
  address?: string;
  date_of_birth?: string;
  board_id?: number;
  grade_id?: number;
  is_active?: boolean;
  is_verified?: boolean;
  suspended?: number;
  dailymessagelimit?: number;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}
```

**File**: [types/index.ts](./src/core/types/index.ts#L7-L34)

---

## Token Storage

Uses **expo-secure-store** for secure token persistence:

**Storage Keys**:
- `auth_access_token` - JWT access token
- `auth_refresh_token` - JWT refresh token
- `auth_token_expiry` - Token expiration timestamp
- `auth_user_data` - Cached user profile JSON

**Platform Support**:
- **iOS**: Keychain
- **Android**: EncryptedSharedPreferences
- **Web**: localStorage (fallback)

**File**: [tokenStorage.ts](./src/core/services/tokenStorage.ts)

---

## Testing

### Test Credentials

According to existing app documentation:

```
Teacher Account:
- Email: teacher@eduvijna.com
- Role: instructor

Student Account:
- Email: student@eduvijna.com
- Role: student

Admin Account:
- Email: admin@eduvijna.com
- Role: admin
```

*(Passwords not documented - obtain from backend team)*

---

## Error Handling

### Authentication Errors (401)

- **Behavior**: Silent logout, redirect to login
- **No alert shown**: User sees login screen automatically
- **Clears**: All tokens and cached user data

### Permission Errors (403)

- **Behavior**: Error logged to console
- **No auto-logout**: User remains logged in
- **UI Handling**: Calling code handles gracefully

### Network Errors

- **Message**: "Network connection failed"
- **No auto-logout**: User can retry when connection restored

### Server Errors (5xx)

- **Message**: "Server error. Please try again later."
- **No auto-logout**: User can retry

---

## Next Steps

1. **Environment Variables**: Configure `EXPO_PUBLIC_API_URL` in `.env` file:
   ```env
   EXPO_PUBLIC_API_URL=https://api.eduvijna.com
   ```

2. **Test Login**: Use actual backend credentials to test authentication flow

3. **Protected Routes**: All API calls automatically include Bearer token via interceptor

4. **Profile Fetching**: Call `getCurrentUser()` to get authenticated user data

---

## Files Modified

1. ✅ [src/core/api/auth.api.ts](./src/core/api/auth.api.ts) - Backend API integration
2. ✅ [src/core/api/config.ts](./src/core/api/config.ts) - Axios interceptors
3. ✅ [src/core/types/index.ts](./src/core/types/index.ts) - User model updated
4. ✅ [src/core/hooks/useAuth.ts](./src/core/hooks/useAuth.ts) - Auth hook ready
5. ✅ [src/platforms/mobile/screens/Login.tsx](./src/platforms/mobile/screens/Login.tsx) - Mobile login UI
6. ✅ [src/platforms/web/screens/Login.tsx](./src/platforms/web/screens/Login.tsx) - Web login UI

---

**Status**: ✅ **Ready for backend testing**

The app now uses the same backend API as the existing "Eduvijna AI APP" application.
