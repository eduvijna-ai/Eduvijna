/** Student mock fixtures — weekly timetable. */

import type { TimetableDay, TimetableSlot } from '../../types/student';

const monday: TimetableSlot[] = [
  { id: 'm1', periodNo: 1, startTime: '08:00 AM', endTime: '08:45 AM', kind: 'period', subject: 'English', topic: 'Grammar', teacher: 'Ms. Priya Sharma', room: '203', icon: 'book-outline', accent: 'blue' },
  { id: 'm2', periodNo: 2, startTime: '08:45 AM', endTime: '09:30 AM', kind: 'period', subject: 'Science', topic: 'Plant Cells', teacher: 'Mr. Rohit Verma', room: '305', icon: 'flask-outline', accent: 'green' },
  { id: 'mb1', startTime: '09:30 AM', endTime: '09:45 AM', kind: 'break', topic: 'Short Break', icon: 'cafe-outline', accent: 'green' },
  { id: 'm3', periodNo: 3, startTime: '09:45 AM', endTime: '10:30 AM', kind: 'period', subject: 'Mathematics', topic: 'Linear Equations', teacher: 'Mr. Amit Singh', room: '201', icon: 'calculator-outline', accent: 'orange' },
  { id: 'm4', periodNo: 4, startTime: '10:30 AM', endTime: '11:15 AM', kind: 'period', subject: 'Social Science', topic: 'Our Environment', teacher: 'Ms. Neha Gupta', room: '204', icon: 'globe-outline', accent: 'purple' },
  { id: 'mb2', startTime: '11:15 AM', endTime: '11:45 AM', kind: 'break', topic: 'Lunch Break', icon: 'restaurant-outline', accent: 'green' },
  { id: 'm5', periodNo: 5, startTime: '11:45 AM', endTime: '12:30 PM', kind: 'period', subject: 'Hindi', topic: 'पाठ - बसंत', teacher: 'Ms. Kavita Joshi', room: '202', icon: 'language-outline', accent: 'red' },
  { id: 'm6', periodNo: 6, startTime: '12:30 PM', endTime: '01:15 PM', kind: 'period', subject: 'Music', topic: 'Vocal Practice', teacher: 'Mr. Sandeep', room: 'Music Room', icon: 'musical-notes-outline', accent: 'pink' },
  { id: 'm7', periodNo: 7, startTime: '01:15 PM', endTime: '02:00 PM', kind: 'period', subject: 'Computer', topic: 'MS Excel Basics', teacher: 'Mr. Vivek Arora', room: 'Lab 1', icon: 'desktop-outline', accent: 'teal' },
  { id: 'm8', periodNo: 8, startTime: '02:00 PM', endTime: '02:30 PM', kind: 'period', subject: 'Physical Education', topic: 'Sports', teacher: 'Mr. Rajat', room: 'Play Ground', icon: 'football-outline', accent: 'pink' },
];

function shiftDay(slots: TimetableSlot[], dayKey: string): TimetableSlot[] {
  return slots.map((slot) => ({ ...slot, id: `${dayKey}-${slot.id}` }));
}

export const timetableWeek: TimetableDay[] = [
  { key: 'mon', weekday: 'Mon', dateLabel: 'Today', isToday: true, slots: monday },
  { key: 'tue', weekday: 'Tue', dateLabel: '20 May', slots: shiftDay(monday, 'tue') },
  { key: 'wed', weekday: 'Wed', dateLabel: '21 May', slots: shiftDay(monday, 'wed') },
  { key: 'thu', weekday: 'Thu', dateLabel: '22 May', slots: shiftDay(monday, 'thu') },
  { key: 'fri', weekday: 'Fri', dateLabel: '23 May', slots: shiftDay(monday, 'fri') },
  { key: 'sat', weekday: 'Sat', dateLabel: '24 May', slots: shiftDay(monday.slice(0, 5), 'sat') },
];

export const schoolTiming = {
  range: '08:00 AM - 02:30 PM',
  totalPeriods: 8,
};
