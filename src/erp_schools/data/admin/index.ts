/**
 * Admin mock data barrel.
 *
 * Single seam between the Admin UI and the data source. Today everything is
 * static fixtures; when the backend is wired up, replace these modules (or back
 * the `useAdminData` selectors with `@core/api`) and no screen needs to change.
 */

export * from './profile';
export * from './dashboard';
export * from './school';
export * from './people';
export * from './academics';
export * from './admissions';
export * from './attendance';
export * from './finance';
export * from './operations';
export * from './communication';
