/**
 * Mock data barrel.
 *
 * IMPORTANT: This folder is the single seam between the UI and the data source.
 * Today everything is static fixtures. When the backend is wired up, replace
 * these modules (or back the `useTeacherData` selectors with `@core/api`) and no
 * screen needs to change.
 */

export * from './classes';
export * from './students';
export * from './schedule';
export * from './timetable';
export * from './attendance';
export * from './assignments';
export * from './assessments';
export * from './materials';
export * from './notices';
export * from './communication';
export * from './payroll';
export * from './reports';
export * from './profile';
