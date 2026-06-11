/**
 * App-wide slide-out side navigation for mobile.
 * Lets users jump between main app areas (Dashboard, Assessments, etc.)
 * from any screen, including the ERP Schools module.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigationState,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@core/hooks/useAuth';
import { useTheme } from '@context/ThemeContext';
import {
  APP_MAIN_TABS,
  type AppMainTab,
} from '@mobile/navigation/appRoutes';
import { navigateToAppMainTab } from '@mobile/navigation/navigateToAppMainTab';

const MAIN_TABS: AppMainTab[] = Object.values(APP_MAIN_TABS);

interface NavItemConfig {
  key: AppMainTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  instructorOnly?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  { key: APP_MAIN_TABS.ANALYTICS, label: 'Analytics', icon: 'stats-chart-outline' },
  { key: APP_MAIN_TABS.ASSESSMENTS, label: 'Assessments', icon: 'document-text-outline' },
  { key: APP_MAIN_TABS.DASHBOARD, label: 'Home', icon: 'home-outline' },
  { key: APP_MAIN_TABS.ERP, label: 'ERP', icon: 'business-outline' },
  { key: APP_MAIN_TABS.ERP_SCHOOLS, label: 'Schools', icon: 'school-outline', instructorOnly: true },
];

interface AppSideNavContextValue {
  open: () => void;
  close: () => void;
  navigateToTab: (tab: AppMainTab) => void;
  activeTab: AppMainTab | null;
}

const AppSideNavContext = createContext<AppSideNavContextValue | null>(null);

function resolveActiveMainTab(
  state: NavigationState | PartialState<NavigationState> | undefined,
): AppMainTab | null {
  if (!state?.routes?.length) return null;

  const mainRoute = state.routes.find((route) => route.name === 'Main');
  const tabState = mainRoute?.state;
  if (!tabState?.routes?.length) return APP_MAIN_TABS.DASHBOARD;

  const focused = tabState.routes[tabState.index ?? 0];
  const name = focused?.name;
  if (name && MAIN_TABS.includes(name as AppMainTab)) {
    return name as AppMainTab;
  }
  return null;
}

export function AppSideNavProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const activeTab = useNavigationState((state) => resolveActiveMainTab(state));

  const navigateToTab = useCallback((tab: AppMainTab) => {
    navigateToAppMainTab(tab);
    setVisible(false);
  }, []);

  const value = useMemo<AppSideNavContextValue>(
    () => ({
      open: () => setVisible(true),
      close: () => setVisible(false),
      navigateToTab,
      activeTab,
    }),
    [navigateToTab, activeTab],
  );

  const items = NAV_ITEMS.filter(
    (item) => !item.instructorOnly || user?.role === 'instructor',
  );

  return (
    <AppSideNavContext.Provider value={value}>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.colors.cardBackground,
                borderRightColor: theme.colors.border,
                paddingTop: insets.top + 12,
                paddingBottom: insets.bottom + 12,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.logoRow}
              onPress={() => navigateToTab(APP_MAIN_TABS.DASHBOARD)}
              accessibilityRole="button"
              accessibilityLabel="Go to home"
            >
              <Image
                source={
                  isDark
                    ? require('../../assets/eduvijna_logo_sidebar_white.png')
                    : require('../../assets/eduvijna_logo_sidebar.png')
                }
                style={styles.logo}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={styles.navList}>
              {items.map((item) => {
                const active = activeTab === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.navItem,
                      active && { backgroundColor: theme.colors.primary + '18' },
                    ]}
                    onPress={() => navigateToTab(item.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        { color: active ? theme.colors.primary : theme.colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {user ? (
              <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                <Text style={[styles.userRole, { color: theme.colors.textSecondary }]}>{user.role}</Text>
                <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>
                  {user.name ?? user.username}
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable style={styles.backdrop} onPress={() => setVisible(false)} accessibilityLabel="Close menu" />
        </View>
      </Modal>
    </AppSideNavContext.Provider>
  );
}

export function useAppSideNav(): AppSideNavContextValue {
  const ctx = useContext(AppSideNavContext);
  if (!ctx) {
    throw new Error('useAppSideNav must be used within AppSideNavProvider');
  }
  return ctx;
}

/** Safe hook for optional side-nav access (returns no-ops outside provider). */
export function useAppSideNavOptional(): AppSideNavContextValue | null {
  return useContext(AppSideNavContext);
}

export type { AppMainTab } from '@mobile/navigation/appRoutes';
export { APP_MAIN_TABS } from '@mobile/navigation/appRoutes';

export function AppSideNavMenuButton({
  color,
  style,
}: {
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const sideNav = useAppSideNavOptional();
  if (!sideNav) return null;

  return (
    <TouchableOpacity
      style={[styles.menuBtn, style]}
      onPress={sideNav.open}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Open navigation menu"
    >
      <Ionicons name="menu" size={26} color={color ?? theme.colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  drawer: {
    width: 280,
    alignSelf: 'stretch',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },
  logoRow: { marginBottom: 20, paddingHorizontal: 4 },
  logo: { width: 140, height: 40 },
  navList: { flex: 1, gap: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 10,
  },
  navLabel: { fontSize: 15, fontWeight: '600' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 2,
  },
  userRole: { fontSize: 11, textTransform: 'capitalize' },
  userName: { fontSize: 14, fontWeight: '700' },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
