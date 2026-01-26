import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { updateGlobalTheme, lightColors, darkColors, ThemeColors } from '../theme/theme';

// Theme type definitions
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface Theme {
  colors: ThemeColors;
  isDark: boolean;
}

// Create themes
const lightTheme: Theme = {
  colors: lightColors,
  isDark: false,
};

const darkTheme: Theme = {
  colors: darkColors,
  isDark: true,
};

// Theme Context
interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'eduvijna_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [currentTheme, setCurrentTheme] = useState<Theme>(lightTheme);

  // Load saved theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when mode or system preference changes
  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      let savedMode: string | null = null;
      
      if (Platform.OS === 'web') {
        savedMode = localStorage.getItem(THEME_STORAGE_KEY);
      } else {
        savedMode = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
      }
      
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(THEME_STORAGE_KEY, mode);
      } else {
        await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
      }
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const updateTheme = () => {
    let selectedTheme: Theme;

    if (themeMode === 'auto') {
      selectedTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
    } else {
      selectedTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    }

    setCurrentTheme(selectedTheme);
    
    // Update global colors - All components automatically update!
    updateGlobalTheme(selectedTheme.isDark);
  };

  const value: ThemeContextValue = {
    theme: currentTheme,
    themeMode,
    setThemeMode,
    colors: currentTheme.colors,
    isDark: currentTheme.isDark,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Export themes
export { lightTheme, darkTheme };
