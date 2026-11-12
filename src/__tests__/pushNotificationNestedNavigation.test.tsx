/**
 * Integration: push destinations against the real Main → tab hierarchy.
 * Mirrors BottomTabNavigator: Notifications is a child tab of Main, not a root stack screen.
 */

import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { act, render, waitFor } from '@testing-library/react-native';
import { navigatePushRootDestination } from '../platforms/mobile/navigation/pushNotificationRootNavigation';
import { handleAppPushNotificationResponse } from '../core/services/appPushNotificationResponse';

jest.mock('../core/services/gradedNotificationRouting.service', () => ({
  resolveStudentGradedAssignmentSession: jest.fn(),
}));
jest.mock('../core/services/assessmentQuizStart.service', () => ({
  executeStudentAssignedQuizViewResults: jest.fn(),
}));
jest.mock('../core/services/openQuizHandler', () => ({
  handleOpenQuiz: jest.fn(),
}));

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardScreen() {
  return (
    <View>
      <Text>Dashboard</Text>
    </View>
  );
}
function AssessmentsTabScreen() {
  return (
    <View>
      <Text>AssessmentsTab</Text>
    </View>
  );
}
function NotificationsScreen() {
  return (
    <View>
      <Text>Notifications</Text>
    </View>
  );
}
function AssessmentsStackScreen() {
  return (
    <View>
      <Text>AssessmentsStack</Text>
    </View>
  );
}
function QuizResultsScreen() {
  return (
    <View>
      <Text>QuizResultsScreen</Text>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Dashboard">
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Assessments" component={AssessmentsTabScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

function TestRoot({ navRef }: { navRef: ReturnType<typeof createNavigationContainerRef> }) {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navRef}>
        <Stack.Navigator initialRouteName="Main">
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Assessments" component={AssessmentsStackScreen} />
          <Stack.Screen name="QuizResultsScreen" component={QuizResultsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function activeLeafName(state: any): string | null {
  if (!state) return null;
  let current = state;
  while (current?.routes && typeof current.index === 'number') {
    const route = current.routes[current.index];
    if (!route) return null;
    if (!route.state) return route.name;
    current = route.state;
  }
  return null;
}

function pushNavigate(navRef: ReturnType<typeof createNavigationContainerRef>) {
  return (screen: string, params?: unknown) => {
    navigatePushRootDestination(
      (name, p) => (navRef as any).navigate(name, p),
      screen,
      params,
    );
  };
}

describe('push notification nested Notifications navigation', () => {
  it('nested Main/{Notifications} activates the Notifications tab without unhandled NAVIGATE', async () => {
    const navRef = createNavigationContainerRef();
    const unhandled: unknown[] = [];
    const prev = console.error;
    console.error = (...args: unknown[]) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('NAVIGATE') || msg.includes('was not handled')) {
        unhandled.push(args);
      }
      prev(...args);
    };

    render(<TestRoot navRef={navRef as any} />);

    await waitFor(() => expect(navRef.isReady()).toBe(true));
    expect(activeLeafName(navRef.getRootState())).toBe('Dashboard');

    await act(async () => {
      pushNavigate(navRef)('Notifications');
    });

    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Notifications'));
    expect(unhandled).toHaveLength(0);
    console.error = prev;
  });

  it('header-bell style nested Main/{Notifications} opens Notifications', async () => {
    const navRef = createNavigationContainerRef();
    render(<TestRoot navRef={navRef as any} />);
    await waitFor(() => expect(navRef.isReady()).toBe(true));

    // CustomHeader uses tab-local navigate('Notifications'); from root ref the
    // equivalent nested action is Main → Notifications (same destination).
    await act(async () => {
      (navRef as any).navigate('Main', { screen: 'Notifications' });
    });

    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Notifications'));
  });

  it('general/self-test tap via handler reaches nested Notifications through root adapter', async () => {
    const navRef = createNavigationContainerRef();
    render(<TestRoot navRef={navRef as any} />);
    await waitFor(() => expect(navRef.isReady()).toBe(true));

    const processed = new Set<string>();
    await act(async () => {
      await handleAppPushNotificationResponse({
        notificationId: 'self-test-nested',
        data: { test: 'true', self_test: 'true' },
        isAuthenticated: true,
        user: { id: 'u1', role: 'instructor' },
        processedIds: processed,
        navigation: { navigate: pushNavigate(navRef) },
        setPendingSessionId: jest.fn(),
      });
    });

    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Notifications'));
  });

  it('signed-out general tap queues; post-login resume opens nested Notifications', async () => {
    const navRef = createNavigationContainerRef();
    render(<TestRoot navRef={navRef as any} />);
    await waitFor(() => expect(navRef.isReady()).toBe(true));

    const processed = new Set<string>();
    const setIntent = jest.fn();
    await handleAppPushNotificationResponse({
      notificationId: 'signed-out-general',
      data: { test: 'true', self_test: 'true' },
      isAuthenticated: false,
      user: null,
      processedIds: processed,
      navigation: { navigate: pushNavigate(navRef) },
      setPendingSessionId: jest.fn(),
      setPendingNotificationIntent: setIntent,
    });

    expect(setIntent).toHaveBeenCalledWith(expect.objectContaining({ type: 'general' }));
    expect(activeLeafName(navRef.getRootState())).toBe('Dashboard');

    await act(async () => {
      await handleAppPushNotificationResponse({
        notificationId: 'resume:general|signed-out-general',
        data: { type: 'general' },
        isAuthenticated: true,
        user: { id: 'u1', role: 'student' },
        processedIds: processed,
        navigation: { navigate: pushNavigate(navRef) },
        setPendingSessionId: jest.fn(),
      });
    });

    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Notifications'));
  });

  it('Assessment stack destinations remain direct root routes', async () => {
    const navRef = createNavigationContainerRef();
    render(<TestRoot navRef={navRef as any} />);
    await waitFor(() => expect(navRef.isReady()).toBe(true));

    await act(async () => {
      pushNavigate(navRef)('QuizResultsScreen', { quizId: '9' });
    });
    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('QuizResultsScreen'));

    await act(async () => {
      pushNavigate(navRef)('Assessments');
    });
    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Assessments'));
  });

  it('foreground/background/cold-start adapters share nested Notifications mapping', async () => {
    const navRef = createNavigationContainerRef();
    render(<TestRoot navRef={navRef as any} />);
    await waitFor(() => expect(navRef.isReady()).toBe(true));
    const processed = new Set<string>();

    for (const notificationId of ['fg-nested', 'bg-nested', 'cold-nested']) {
      await act(async () => {
        await handleAppPushNotificationResponse({
          notificationId,
          data: { type: 'general' },
          isAuthenticated: true,
          user: { id: 'u1', role: 'student' },
          processedIds: processed,
          navigation: { navigate: pushNavigate(navRef) },
          setPendingSessionId: jest.fn(),
        });
      });
      await act(async () => {
        (navRef as any).navigate('Main', { screen: 'Dashboard' });
      });
    }

    await act(async () => {
      await handleAppPushNotificationResponse({
        notificationId: 'final-general',
        data: { type: 'announcement' },
        isAuthenticated: true,
        user: { id: 'u1', role: 'student' },
        processedIds: processed,
        navigation: { navigate: pushNavigate(navRef) },
        setPendingSessionId: jest.fn(),
      });
    });
    await waitFor(() => expect(activeLeafName(navRef.getRootState())).toBe('Notifications'));
  });
});
