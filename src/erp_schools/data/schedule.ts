/** Mock fixtures — dashboard today's schedule + announcements. */

import type { SchedulePeriod, Announcement } from '../types/domain';

export const todaysSchedule: SchedulePeriod[] = [
  { id: 'p1', startTime: '08:30 AM', endTime: '09:15 AM', classCode: '7-B', subject: 'Mathematics', room: 'Room 201' },
  { id: 'p2', startTime: '09:20 AM', endTime: '10:05 AM', classCode: '8-A', subject: 'Science', room: 'Room 204' },
  { id: 'p3', startTime: '10:20 AM', endTime: '11:05 AM', classCode: '9-C', subject: 'English', room: 'Room 203' },
];

export const recentAnnouncements: Announcement[] = [
  {
    id: 'a1',
    title: 'PTM on Saturday',
    body: 'Parent Teacher Meeting scheduled on 18 May 2025.',
    date: 'May 12, 2025',
    isNew: true,
    scope: 'school',
  },
  {
    id: 'a2',
    title: 'Science Project Submission',
    body: 'Reminder: Science project submissions are due on 20 May 2025.',
    date: 'May 10, 2025',
    scope: 'class',
  },
];

export const dashboardOverview = {
  students: 124,
  classes: 6,
  assignments: 18,
  avgAttendance: 92,
};
