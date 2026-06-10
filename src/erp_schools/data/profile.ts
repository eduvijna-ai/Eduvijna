/** Mock fixtures — teacher profile + notifications. */

import type { TeacherProfile, NotificationItem } from '../types/domain';

export const teacherProfile: TeacherProfile = {
  name: 'Priya Sharma',
  role: 'Science Teacher',
  employeeId: 'TCH1234',
  email: 'priya.sharma@eduvijna.com',
  phone: '+91 98765 43210',
  subjects: ['Science', 'Biology', 'Environmental Studies'],
  joinedOn: 'Joined June 2021',
};

export const notifications: NotificationItem[] = [
  { id: 'nt1', title: 'New parent message', body: 'Mrs. Neha Sharma sent you a message about Aarav.', timeLabel: '10:30 AM', iconName: 'chatbubble-ellipses-outline', accent: 'blue', read: false },
  { id: 'nt2', title: 'Assignment due soon', body: 'Cell Structure Worksheet is due on 20 May 2025.', timeLabel: '2h ago', iconName: 'clipboard-outline', accent: 'orange', read: false },
  { id: 'nt3', title: 'Attendance reminder', body: 'Mark attendance for Class 8-A (09:20 AM).', timeLabel: '4h ago', iconName: 'calendar-outline', accent: 'green', read: true },
  { id: 'nt4', title: 'Leave approved', body: 'Your casual leave for 12 May 2025 has been approved.', timeLabel: 'Yesterday', iconName: 'checkmark-circle-outline', accent: 'teal', read: true },
  { id: 'nt5', title: 'New notice published', body: 'PTM Schedule has been posted by Admin.', timeLabel: '2 days ago', iconName: 'megaphone-outline', accent: 'purple', read: true },
];
