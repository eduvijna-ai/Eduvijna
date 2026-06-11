/**
 * TeacherNavigator — the public entry point of the ERP Schools module.
 *
 * This is a plain navigator component (NOT a NavigationContainer): it is meant to
 * be mounted additively inside the app's existing navigation tree — e.g. as a
 * `Tab.Screen` or `Stack.Screen` alongside the current ERP navigator — so it
 * never owns or replaces the root container and causes zero breaking changes.
 *
 * Future personas (Student / Parent / Principal / Admin) plug in here by
 * branching on `useTeacherSession().persona` and rendering the matching stack,
 * without touching any existing ERP code.
 */

import React from 'react';
import { TeacherStack } from './TeacherStack';

export function TeacherNavigator() {
  return <TeacherStack />;
}

export default TeacherNavigator;
