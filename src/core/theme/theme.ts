/**
 * Theme Configuration
 * Light and Dark theme definitions
 */

// Light Theme Colors
export const lightColors = {
  // Main Colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1B4F5C',
  textSecondary: '#666666',
  primary: '#1B4F5C',
  accent: '#2B5F6C',

  // UI Colors
  selectedBackground: '#f0f7ff',
  
  // Status Colors
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#EF4444',
  info: '#2196F3',

  // UI Element Colors
  border: '#E0E0E0',
  divider: '#E5E5E5',
  placeholder: '#999999',
  disabled: '#CCCCCC',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
  
  // Specific UI Colors
  headerBackground: '#1B4F5C',
  cardBackground: '#FFFFFF',
  inputBackground: '#F5F5F5',
  buttonPrimary: '#1B4F5C',
  buttonSecondary: '#E0E0E0',
  buttonText: '#FFFFFF',
};

// Dark Theme Colors
export const darkColors = {
  // Main Colors
  background: '#000000',
  surface: '#1C1C1C',
  card: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  primary: '#5ABEDB',
  accent: '#6BB5C8',

  // UI Colors
  selectedBackground: '#1e3a4a',
  
  // Status Colors
  success: '#66BB6A',
  warning: '#FFD54F',
  error: '#EF5350',
  info: '#42A5F5',
  
  // UI Element Colors
  border: '#404040',
  divider: '#333333',
  placeholder: '#808080',
  disabled: '#555555',
  overlay: 'rgba(0, 0, 0, 0.8)',
  shadow: '#000000',
  
  // Specific UI Colors
  headerBackground: '#1C1C1C',
  cardBackground: '#2C2C2C',
  inputBackground: '#404040',
  buttonPrimary: '#5ABEDB',
  buttonSecondary: '#404040',
  buttonText: '#FFFFFF',
};

// Track current theme
let currentColors = lightColors;

// Function to update global colors (called by ThemeContext)
export const updateGlobalTheme = (isDark: boolean) => {
  currentColors = isDark ? darkColors : lightColors;
};

// Export colors as a Proxy that always returns current theme values
export const colors = new Proxy({} as typeof lightColors, {
  get(_target, prop: string) {
    return currentColors[prop as keyof typeof currentColors];
  }
});

export type ThemeColors = typeof lightColors;
