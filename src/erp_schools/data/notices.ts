/** Mock fixtures — notice board. */

import type { Notice } from '../types/domain';

export const notices: Notice[] = [
  {
    id: 'n1',
    scope: 'class',
    title: 'Science Project Submission',
    body: 'This is to inform all students that the Science project is due on 20 May 2025. Please submit your project on time.',
    date: '11 May 2025',
    author: 'By You',
    audience: 'Class 8-A',
    pinned: true,
  },
  {
    id: 'n2',
    scope: 'school',
    title: 'PTM Schedule',
    body: 'PTM for Classes 6 to 10 will be held on 18 May 2025 (Saturday) from 10:00 AM to 1:00 PM.',
    date: '09 May 2025',
    author: 'By Admin',
    audience: 'Whole School',
  },
  {
    id: 'n3',
    scope: 'group',
    title: 'Quiz on Cell Structure',
    body: 'Quiz on Chapter 5 - Cell Structure will be held on 14 May 2025. Syllabus: Notes from class and worksheets.',
    date: '08 May 2025',
    author: 'By You',
    audience: 'Science Group (8-A, 8-B)',
  },
  {
    id: 'n4',
    scope: 'class',
    title: 'Bring Lab Coat',
    body: 'Students are requested to bring their lab coat for the upcoming practical sessions.',
    date: '05 May 2025',
    author: 'By You',
    audience: 'Class 8-A',
  },
  {
    id: 'n5',
    scope: 'school',
    title: 'Inter-School Science Competition',
    body: 'Registrations are open for the Inter-School Science Competition. Interested students can give their names to the Science staff.',
    date: '01 May 2025',
    author: 'By Admin',
    audience: 'Whole School',
  },
];

export const scheduledNotices: Notice[] = [
  {
    id: 'sn1',
    scope: 'class',
    title: 'Revision Reminder',
    body: 'Auto-publishes on 19 May 2025, 08:00 AM — Revise Chapters 4 & 5 before the unit test.',
    date: 'Scheduled · 19 May 2025',
    author: 'By You',
    audience: 'Class 8-A',
    scheduled: true,
  },
  {
    id: 'sn2',
    scope: 'group',
    title: 'Field Trip Consent',
    body: 'Auto-publishes on 22 May 2025, 09:00 AM — Submit signed consent forms for the museum visit.',
    date: 'Scheduled · 22 May 2025',
    author: 'By You',
    audience: 'Science Group',
    scheduled: true,
  },
];
