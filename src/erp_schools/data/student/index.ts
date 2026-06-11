/**
 * Student mock data barrel.
 *
 * Single seam between the Student UI and the data source. Today everything is
 * static fixtures; when the backend is wired up, replace these modules (or back
 * the `useStudentData` selectors with `@core/api`) and no screen needs to change.
 */

export * from './profile';
export * from './dashboard';
export * from './attendance';
export * from './academics';
export * from './assignments';
export * from './timetable';
export * from './exams';
export * from './fees';
export * from './library';
export * from './updates';
