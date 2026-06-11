/** Student mock fixtures — notices, events, notifications (the "Updates" hub). */

import type {
  StudentNotice,
  StudentEvent,
  StudentNotification,
} from '../../types/student';

export const studentNotices: StudentNotice[] = [
  { id: 'no1', category: 'urgent', title: 'Holiday on 20th May 2024', body: 'This is to inform all students and parents that the school will remain closed on 20th May 2024 on account of the State Day celebration.', author: 'By Admin', dateLabel: '16 May 2024', timeLabel: '10:30 AM', icon: 'megaphone-outline', accent: 'blue', pinned: true },
  { id: 'no2', category: 'class', title: 'Periodic Test - Timetable', body: 'The Periodic Test I for all subjects is scheduled from 27th May to 31st May 2024. Please check the timetable.', author: 'By Class Teacher', dateLabel: '15 May 2024', timeLabel: '04:15 PM', icon: 'book-outline', accent: 'green' },
  { id: 'no3', category: 'school', title: 'Inter-House Debate Competition', body: 'Inter-House Debate Competition will be held on 30th May 2024. Interested students can give their names to their House Incharges.', author: 'By Activity Incharge', dateLabel: '14 May 2024', timeLabel: '11:20 AM', icon: 'trophy-outline', accent: 'purple' },
  { id: 'no4', category: 'circular', title: 'Transport Route Update', body: 'Please note the updated bus routes and timings effective from 17th May 2024.', author: 'By Transport Department', dateLabel: '13 May 2024', timeLabel: '02:45 PM', icon: 'document-outline', accent: 'orange' },
  { id: 'no5', category: 'school', title: 'Health Check-up Camp', body: 'A general health check-up camp will be organized on 25th May 2024. Parental consent is mandatory for participation.', author: 'By School Nurse', dateLabel: '12 May 2024', timeLabel: '09:00 AM', icon: 'heart-outline', accent: 'red' },
];

export const studentEvents: StudentEvent[] = [
  { id: 'ev1', title: 'Annual Day Celebration', category: 'school', categoryLabel: 'School Event', day: '18', month: 'MAY', weekday: 'SAT', timeLabel: '10:00 AM - 1:00 PM', location: 'School Auditorium', icon: 'school-outline', accent: 'blue' },
  { id: 'ev2', title: 'Science Exhibition', category: 'academic', categoryLabel: 'Academic', day: '22', month: 'MAY', weekday: 'WED', timeLabel: '09:30 AM - 12:30 PM', location: 'Science Block', icon: 'book-outline', accent: 'green' },
  { id: 'ev3', title: 'Inter-House Football Match', category: 'sports', categoryLabel: 'Sports', day: '28', month: 'MAY', weekday: 'TUE', timeLabel: '04:00 PM - 06:00 PM', location: 'School Playground', icon: 'football-outline', accent: 'orange' },
  { id: 'ev4', title: 'Elocution Competition', category: 'competition', categoryLabel: 'Competition', day: '05', month: 'JUN', weekday: 'WED', timeLabel: '11:00 AM - 01:00 PM', location: 'Seminar Hall', icon: 'trophy-outline', accent: 'purple' },
];

export const recentEvents: StudentEvent[] = [
  { id: 'rv1', title: 'Earth Day Celebration', category: 'school', categoryLabel: 'School Event', day: '26', month: 'APR', weekday: 'FRI', timeLabel: '10:00 AM - 11:30 AM', location: 'School Campus', icon: 'sparkles-outline', accent: 'red', completed: true },
  { id: 'rv2', title: 'Annual Sports Day', category: 'sports', categoryLabel: 'Sports', day: '15', month: 'APR', weekday: 'MON', timeLabel: '09:00 AM - 04:00 PM', location: 'Sports Ground', icon: 'football-outline', accent: 'green', completed: true },
];

export const studentNotifications: StudentNotification[] = [
  { id: 'nt1', title: 'New assignment posted', body: 'Maths – Linear Equations is due on 25 Apr 2025.', timeLabel: '10:30 AM', icon: 'document-text-outline', accent: 'blue', read: false },
  { id: 'nt2', title: 'Marks published', body: 'Your Periodic Test - I results are now available.', timeLabel: '2h ago', icon: 'ribbon-outline', accent: 'green', read: false },
  { id: 'nt3', title: 'Fee reminder', body: '3rd installment of ₹12,000 is due on 10 Oct 2024.', timeLabel: '5h ago', icon: 'wallet-outline', accent: 'orange', read: true },
  { id: 'nt4', title: 'Library due soon', body: 'Charlie and the Chocolate Factory is due on 24 May 2024.', timeLabel: 'Yesterday', icon: 'book-outline', accent: 'purple', read: true },
  { id: 'nt5', title: 'Event reminder', body: 'Annual Day Celebration on 18 May 2025.', timeLabel: '2 days ago', icon: 'calendar-outline', accent: 'teal', read: true },
];
