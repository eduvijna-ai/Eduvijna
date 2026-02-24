/**
 * Theme Configuration
 * Light and Dark theme definitions
 */

export interface Theme {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    disabled: string;
    placeholder: string;
    overlay: string;
    notification: string;
    headerBackground: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonText: string;
    linkColor: string;
    linkHover: string;
    cardBackground: string;
    inputBackground: string;
    divider: string;
    shadow: string;
    selectedBackground: string;
    accent: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  fontSizes: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  fontWeights: {
    normal: '400';
    medium: '500';
    semibold: '600';
    bold: '700';
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: '#1B4F5C',
    primaryDark: '#154048',
    primaryLight: '#2B5F6C',
    secondary: '#2196F3',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#1B4F5C',
    textSecondary: '#666666',
    border: '#E0E0E0',
    error: '#F44336',
    success: '#4CAF50',
    warning: '#FFC107',
    info: '#2196F3',
    disabled: '#CCCCCC',
    placeholder: '#999999',
    overlay: 'rgba(0, 0, 0, 0.5)',
    notification: '#F44336',
    headerBackground: '#1B4F5C',
    buttonPrimary: '#1B4F5C',
    buttonSecondary: '#E0E0E0',
    buttonText: '#FFFFFF',
    linkColor: '#1B4F5C',
    linkHover: '#2B5F6C',
    cardBackground: '#FFFFFF',
    inputBackground: '#F5F5F5',
    divider: '#E5E5E5',
    shadow: '#000000',
    selectedBackground: '#f0f7ff',
    accent: '#2B5F6C',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const darkTheme: Theme = {
  colors: {
    primary: '#5ABEDB',
    primaryDark: '#4AA5C5',
    primaryLight: '#6BB5C8',
    secondary: '#42A5F5',
    background: '#000000',
    surface: '#1C1C1C',
    card: '#2C2C2C',
    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#404040',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFD54F',
    info: '#42A5F5',
    disabled: '#555555',
    placeholder: '#808080',
    overlay: 'rgba(0, 0, 0, 0.8)',
    notification: '#EF5350',
    headerBackground: '#1C1C1C',
    buttonPrimary: '#5ABEDB',
    buttonSecondary: '#404040',
    buttonText: '#FFFFFF',
    linkColor: '#5ABEDB',
    linkHover: '#6BB5C8',
    cardBackground: '#2C2C2C',
    inputBackground: '#404040',
    divider: '#333333',
    shadow: '#000000',
    selectedBackground: '#1e3a4a',
    accent: '#6BB5C8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};
