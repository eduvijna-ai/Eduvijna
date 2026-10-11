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

// Hold the native splash before the first render, then release it on success or error.
// Calling this from an effect can race with hideAsync when fonts are already cached.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export function useAppFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (fontsLoaded) setupGlobalFonts();
    SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError };
}
