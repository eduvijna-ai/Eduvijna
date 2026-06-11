/** Student mock fixtures — exam schedule + exam results. */

import type { ExamScheduleItem, ExamResultItem } from '../../types/student';

export const examSchedule: ExamScheduleItem[] = [
  { id: 'ex1', subject: 'English', icon: 'book-outline', accent: 'blue', dateLabel: '20 May 2025', timeLabel: '09:00 AM - 11:00 AM', room: 'Hall A', durationLabel: '2 hrs', state: 'upcoming' },
  { id: 'ex2', subject: 'Mathematics', icon: 'calculator-outline', accent: 'orange', dateLabel: '22 May 2025', timeLabel: '09:00 AM - 11:30 AM', room: 'Hall A', durationLabel: '2.5 hrs', state: 'upcoming' },
  { id: 'ex3', subject: 'Science', icon: 'flask-outline', accent: 'green', dateLabel: '24 May 2025', timeLabel: '09:00 AM - 11:00 AM', room: 'Hall B', durationLabel: '2 hrs', state: 'upcoming' },
  { id: 'ex4', subject: 'Social Science', icon: 'globe-outline', accent: 'purple', dateLabel: '26 May 2025', timeLabel: '09:00 AM - 11:00 AM', room: 'Hall B', durationLabel: '2 hrs', state: 'upcoming' },
  { id: 'ex5', subject: 'Hindi', icon: 'language-outline', accent: 'red', dateLabel: '28 May 2025', timeLabel: '09:00 AM - 11:00 AM', room: 'Hall A', durationLabel: '2 hrs', state: 'upcoming' },
];

export const examResultsSummary = {
  examName: 'Periodic Test - I',
  overallPercent: 85.6,
  grade: 'A',
  rank: 3,
  classStrength: 32,
};

export const examResults: ExamResultItem[] = [
  { id: 'er1', subject: 'English', icon: 'book-outline', accent: 'blue', obtained: 86, maxMarks: 100, percent: 86, grade: 'A' },
  { id: 'er2', subject: 'Mathematics', icon: 'calculator-outline', accent: 'orange', obtained: 86, maxMarks: 100, percent: 86, grade: 'A' },
  { id: 'er3', subject: 'Science', icon: 'flask-outline', accent: 'green', obtained: 87, maxMarks: 100, percent: 87, grade: 'A+' },
  { id: 'er4', subject: 'Social Science', icon: 'globe-outline', accent: 'purple', obtained: 80, maxMarks: 100, percent: 80, grade: 'A' },
  { id: 'er5', subject: 'Hindi', icon: 'language-outline', accent: 'red', obtained: 84, maxMarks: 100, percent: 84, grade: 'A' },
];
