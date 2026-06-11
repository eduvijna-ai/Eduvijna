/** Student mock fixtures — home dashboard (schedule, announcements, overview). */

import type {
  StudentDashboardOverview,
  StudentScheduleItem,
  StudentAnnouncement,
} from '../../types/student';

export const studentOverview: StudentDashboardOverview = {
  attendancePercent: 88,
  averageMarks: 85,
  classRank: 3,
  totalAssignments: 8,
  pendingAssignments: 3,
};

export const todaysSchedule: StudentScheduleItem[] = [
  { id: 'sc1', startTime: '08:30 AM', endTime: '09:15 AM', subject: 'Mathematics', room: 'Room 201', teacher: 'Mr. Sharma', status: 'completed' },
  { id: 'sc2', startTime: '09:20 AM', endTime: '10:05 AM', subject: 'Science', room: 'Room 204', teacher: 'Ms. Verma', status: 'upcoming' },
  { id: 'sc3', startTime: '10:20 AM', endTime: '11:05 AM', subject: 'English', room: 'Room 203', teacher: 'Mr. Gupta', status: 'upcoming' },
];

export const studentAnnouncements: StudentAnnouncement[] = [
  { id: 'an1', title: 'PTM on Saturday', body: 'Parent Teacher Meeting scheduled on 18 May 2025.', date: 'May 12, 2025', isNew: true },
  { id: 'an2', title: 'Science Exhibition', body: 'Science exhibition registrations close on 16 May 2025.', date: 'May 10, 2025' },
];
