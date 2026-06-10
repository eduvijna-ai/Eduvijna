/**
 * Loads Poppins via expo-font and registers global Text defaults.
 */

import { useEffect } from 'react';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { setupGlobalFonts } from './fonts';

let splashPrevented = false;

async function ensureSplashHeld(): Promise<void> {
  if (splashPrevented) return;
  splashPrevented = true;
  try {
    await SplashScreen.preventAutoHideAsync();
  } catch {
    // Expo Go / web may not support splash screen
  }
}

export function useAppFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    void ensureSplashHeld();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    setupGlobalFonts();
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  return { fontsLoaded, fontError };
}
