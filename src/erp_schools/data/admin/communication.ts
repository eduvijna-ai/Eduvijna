/** Admin mock fixtures — announcements & notifications. */

import type { AdminAnnouncement, AdminNotification } from '../../types/admin';

export const adminAnnouncements: AdminAnnouncement[] = [
  { id: 'an1', category: 'general', categoryLabel: 'General', title: 'School Reopens on 1st July 2026', body: 'We are excited to inform you that the school will reopen for the new academic year on 1st July 2026.', dateLabel: '16 Jun 2026 • 09:30 AM', author: 'By Admin', icon: 'megaphone-outline', accent: 'green', pinned: true },
  { id: 'an2', category: 'academics', categoryLabel: 'Academics', title: 'Mid-Term Examination Schedule', body: 'Mid-Term examinations will be conducted from 15th July to 25th July 2026. Please check the timetable.', dateLabel: '15 Jun 2026 • 11:00 AM', author: 'By Vice Principal', icon: 'book-outline', accent: 'purple', pinned: true },
  { id: 'an3', category: 'events', categoryLabel: 'Events', title: 'Annual Sports Day 2026', body: 'Join us for our Annual Sports Day on 10th August 2026 at the school ground. More details to follow.', dateLabel: '14 Jun 2026 • 03:20 PM', author: 'By Sports Department', icon: 'trophy-outline', accent: 'orange' },
  { id: 'an4', category: 'exams', categoryLabel: 'Exams', title: 'Pre-Board Examination Guidelines', body: 'Please find the important instructions and guidelines for the upcoming Pre-Board Examinations.', dateLabel: '13 Jun 2026 • 10:15 AM', author: 'By Examination Cell', icon: 'clipboard-outline', accent: 'blue' },
  { id: 'an5', category: 'transport', categoryLabel: 'Transport', title: 'Transport Timing Change', body: 'From 20th June 2026, the evening transport timing will be changed. Please check the new schedule.', dateLabel: '12 Jun 2026 • 04:45 PM', author: 'By Transport Incharge', icon: 'bus-outline', accent: 'pink' },
  { id: 'an6', category: 'general', categoryLabel: 'General', title: 'Parent-Teacher Meeting', body: 'PTM for Grades 6 to 10 will be held on 22nd June 2026. Please book your slots on the portal.', dateLabel: '11 Jun 2026 • 09:00 AM', author: 'By Admin', icon: 'people-outline', accent: 'green' },
];

export const adminNotifications: AdminNotification[] = [
  { id: 'nt1', title: 'Fee Defaulters Report Ready', body: '12 students have overdue fees this week.', timeLabel: '10m ago', icon: 'wallet-outline', accent: 'red', read: false },
  { id: 'nt2', title: 'New Admission Application', body: 'Aarav Sharma applied for Grade 6.', timeLabel: '1h ago', icon: 'person-add-outline', accent: 'teal', read: false },
  { id: 'nt3', title: 'Teacher Leave Request', body: 'Ms. Priya Singh requested medical leave.', timeLabel: '3h ago', icon: 'people-outline', accent: 'blue', read: false },
  { id: 'nt4', title: 'Attendance Alert', body: 'Grade 7-A attendance dropped by 8%.', timeLabel: '5h ago', icon: 'trending-down-outline', accent: 'orange', read: true },
  { id: 'nt5', title: 'Report Generated', body: 'Monthly Academic Performance report is ready.', timeLabel: '1d ago', icon: 'document-text-outline', accent: 'purple', read: true },
];
