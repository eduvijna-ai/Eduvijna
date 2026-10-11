/**
 * Loads Poppins via expo-font and registers global Text defaults.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

const WEB_FONT_FALLBACK_MS = 12_000;

export function useAppFonts(): { fontsLoaded: boolean; fontError: Error | null } {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [webFallbackReady, setWebFallbackReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => setWebFallbackReady(true), WEB_FONT_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  const ready = fontsLoaded || fontError != null || (Platform.OS === 'web' && webFallbackReady);

  useEffect(() => {
    if (!ready) return;
    if (fontsLoaded) setupGlobalFonts();
    SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, fontsLoaded]);

  return { fontsLoaded: ready, fontError };
}
