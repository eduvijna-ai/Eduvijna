/**
 * Mobile app — main section route names shared by the bottom tabs and side nav.
 */

export const APP_MAIN_TABS = {
  DASHBOARD: 'Dashboard',
  ASSESSMENTS: 'Assessments',
  ANALYTICS: 'Analytics',
  ERP: 'ERP',
  ERP_SCHOOLS: 'ERPSchools',
} as const;

export type AppMainTab = (typeof APP_MAIN_TABS)[keyof typeof APP_MAIN_TABS];

export const APP_STACK_ROUTES = {
  MAIN: 'Main',
} as const;

export interface AppMainTabParamList {
  [APP_MAIN_TABS.DASHBOARD]: undefined;
  [APP_MAIN_TABS.ASSESSMENTS]: undefined;
  [APP_MAIN_TABS.ANALYTICS]: undefined;
  [APP_MAIN_TABS.ERP]: undefined;
  [APP_MAIN_TABS.ERP_SCHOOLS]: undefined;
  Notifications: undefined;
  Profile: undefined;
}
