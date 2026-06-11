/** Mock fixtures — assessments / grading. */

import type { Assessment } from '../types/domain';

export const assessments: Assessment[] = [
  { id: 'ax1', title: 'Unit Test 1 — Cell Biology', classCode: '8-A', subject: 'Science', date: '14 May 2025', maxMarks: 50, state: 'completed', averageScore: 78, graded: 32, total: 32 },
  { id: 'ax2', title: 'Class Quiz — Microorganisms', classCode: '8-A', subject: 'Science', date: '21 May 2025', maxMarks: 20, state: 'upcoming', graded: 0, total: 32 },
  { id: 'ax3', title: 'Mid-Term Exam', classCode: '9-A', subject: 'Science', date: '10 May 2025', maxMarks: 80, state: 'completed', averageScore: 71, graded: 28, total: 34 },
  { id: 'ax4', title: 'Oral Assessment', classCode: '9-B', subject: 'Science', date: '16 May 2025', maxMarks: 25, state: 'ongoing', graded: 12, total: 33 },
];

export const assessmentsSummary = {
  upcoming: 1,
  ongoing: 1,
  completed: 2,
  avgScore: 76,
};
