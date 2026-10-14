import { renderHook, waitFor } from '@testing-library/react-native';
import { useFonts } from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { setupGlobalFonts } from '../theme/fonts';
import { useAppFonts } from '../theme/useAppFonts';

jest.mock('@expo-google-fonts/poppins', () => ({ useFonts: jest.fn() }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../theme/fonts', () => ({ setupGlobalFonts: jest.fn() }));

it('releases the splash after fonts load', async () => {
  (useFonts as jest.Mock).mockReturnValue([true, null]);
  renderHook(() => useAppFonts());
  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(setupGlobalFonts).toHaveBeenCalled();
});

it('releases the splash on font failure so AppWithFonts can render', async () => {
  jest.clearAllMocks();
  (useFonts as jest.Mock).mockReturnValue([false, new Error('font load failed')]);
  renderHook(() => useAppFonts());
  await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());
  expect(setupGlobalFonts).not.toHaveBeenCalled();
});

it('keeps the splash while fonts are pending', () => {
  jest.clearAllMocks();
  (useFonts as jest.Mock).mockReturnValue([false, null]);
  renderHook(() => useAppFonts());
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
});
