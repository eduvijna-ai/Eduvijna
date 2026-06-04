/**
 * Global Jest test setup
 * Mocks platform dependencies that are unavailable in the Node test environment.
 */

import '@testing-library/jest-native/extend-expect';

// ── Silence ALL console output in tests (noisy React 19 passive-effect warnings) ─
console.error = () => {};
console.warn = () => {};

// ── expo-constants ─────────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { API_BASE_URL: 'https://eduapi.eduvijna.com' },
    },
  },
}));

// ── expo-secure-store ──────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ── @react-native-async-storage/async-storage ─────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  multiGet: jest.fn().mockResolvedValue([]),
  multiSet: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// ── react-native-safe-area-context ─────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    SafeAreaProvider: ({ children }: any) => children,
    SafeAreaView: View,
  };
});

// ── expo-image-picker ─────────────────────────────────────────────────────
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images', All: 'All' },
}));

// ── expo-document-picker ──────────────────────────────────────────────────
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
}));

// ── expo-image-manipulator ────────────────────────────────────────────────
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn().mockReturnValue({
      resize: jest.fn(),
      crop: jest.fn(),
      renderAsync: jest.fn().mockResolvedValue({
        saveAsync: jest.fn().mockResolvedValue({ uri: 'compressed://mock-image.jpg' }),
        release: jest.fn(),
      }),
      release: jest.fn(),
    }),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

// ── expo-file-system ──────────────────────────────────────────────────────
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    uri,
    size: 1024 * 512, // 512 KB
  })),
  documentDirectory: 'file:///mock-documents/',
  cacheDirectory: 'file:///mock-cache/',
}));

// ── expo-notifications ────────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-token' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-id'),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
}));

// ── @expo/vector-icons ────────────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, testID }: any) =>
      require('react').createElement(Text, { testID: testID ?? `icon-${name}` }, name),
  };
});

// ── ThemeContext ──────────────────────────────────────────────────────────
jest.mock('@context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#6366F1',
        background: '#FFFFFF',
        card: '#F8FAFC',
        cardBackground: '#F8FAFC',
        text: '#0F172A',
        textSecondary: '#64748B',
        border: '#E2E8F0',
        placeholder: '#94A3B8',
        primaryLight: '#818CF8',
        inputBackground: '#F1F5F9',
        success: '#10B981',
        error: '#EF4444',
      },
    },
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// ── DropdownContext ───────────────────────────────────────────────────────
jest.mock('../context/DropdownContext', () => ({
  useDropdowns: () => ({
    classes: [
      { id: '1', name: 'Class 10' },
      { id: '2', name: 'Class 11' },
    ],
    subjects: [
      { id: '10', name: 'Physics' },
      { id: '11', name: 'Chemistry' },
    ],
    difficultyLevels: [
      { id: 'easy', name: 'Easy', label: 'Easy', value: 'easy' },
      { id: 'medium', name: 'Medium', label: 'Medium', value: 'medium' },
      { id: 'hard', name: 'Hard', label: 'Hard', value: 'hard' },
    ],
    isLoadingClasses: false,
    isLoadingSubjects: false,
    isLoadingDifficulty: false,
  }),
}));

// ── useNotifications hook ─────────────────────────────────────────────────
jest.mock('@core/hooks/useNotifications', () => () => ({
  refreshAfterQuizGenerated: jest.fn().mockResolvedValue(undefined),
}));

// ── apiClient (axios instance) ────────────────────────────────────────────
jest.mock('../core/api/config', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE_URL: 'https://eduapi.eduvijna.com',
}));

// ── cacheService (used by api/config on import) ───────────────────────────
jest.mock('../core/services/cacheService', () => ({
  initializeCache: jest.fn().mockResolvedValue(undefined),
  closeCache: jest.fn().mockResolvedValue(undefined),
}));

// ── tokenStorage ─────────────────────────────────────────────────────────
jest.mock('../core/services/tokenStorage', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
  setTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

// ── react-native-webview ────────────────────────────────────────────────
jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: View,
    default: View,
  };
});

// ── user store ────────────────────────────────────────────────────────────
jest.mock('../core/store/user.store', () => {
  const mockState = {
    user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'teacher' },
    isAuthenticated: true,
    isLoading: false,
    schoolId: 42,
    userId: 1,
    role: 'teacher',
    setUser: jest.fn(),
    setAuthenticated: jest.fn(),
    setLoading: jest.fn(),
    setSchoolId: jest.fn(),
    logout: jest.fn(),
  };
  return {
    useUserStore: jest.fn().mockImplementation((selector?: any) =>
      typeof selector === 'function' ? selector(mockState) : mockState,
    ),
  };
});
