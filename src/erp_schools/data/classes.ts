/** Mock fixtures — assigned classes. Replace with API later (no screen changes). */

import type { ClassInfo } from '../types/domain';

export const teacherClasses: ClassInfo[] = [
  { id: 'c-8a', code: '8-A', name: 'Class 8-A', subject: 'Science', room: 'Room 204', studentCount: 32, periodsPerWeek: 5, accent: 'blue' },
  { id: 'c-8b', code: '8-B', name: 'Class 8-B', subject: 'Science', room: 'Room 205', studentCount: 30, periodsPerWeek: 5, accent: 'green' },
  { id: 'c-9a', code: '9-A', name: 'Class 9-A', subject: 'Science', room: 'Room 203', studentCount: 34, periodsPerWeek: 5, accent: 'orange' },
  { id: 'c-9b', code: '9-B', name: 'Class 9-B', subject: 'Science', room: 'Room 206', studentCount: 33, periodsPerWeek: 5, accent: 'purple' },
  { id: 'c-10a', code: '10-A', name: 'Class 10-A', subject: 'Science', room: 'Room 202', studentCount: 33, periodsPerWeek: 5, accent: 'blue' },
];

export const classesSummary = {
  classesAssigned: 5,
  totalStudents: 162,
  subjectsTeaching: 18,
  weeklyPeriods: 25,
};
