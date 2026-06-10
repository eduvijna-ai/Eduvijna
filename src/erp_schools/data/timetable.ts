/** Mock fixtures — class timetable (per-day periods). */

import type { TimetableEntry } from '../types/domain';

export const weekDays = [
  { key: 'mon', label: 'Mon', date: '12 May' },
  { key: 'tue', label: 'Tue', date: '13 May' },
  { key: 'wed', label: 'Wed', date: '14 May' },
  { key: 'thu', label: 'Thu', date: '15 May' },
  { key: 'fri', label: 'Fri', date: '16 May' },
  { key: 'sat', label: 'Sat', date: '17 May' },
];

export const timetableByDay: Record<string, TimetableEntry[]> = {
  mon: [
    { id: 't1', periodNo: 1, startTime: '08:30 AM', endTime: '09:15 AM', kind: 'period', subject: 'Science', topic: 'Cell Structure', room: 'Room 204', accent: 'green', iconName: 'flask-outline' },
    { id: 't2', periodNo: 2, startTime: '09:20 AM', endTime: '10:05 AM', kind: 'period', subject: 'Mathematics', topic: 'Algebraic Expressions', room: 'Room 201', accent: 'blue', iconName: 'calculator-outline' },
    { id: 't3', periodNo: 3, startTime: '10:20 AM', endTime: '11:05 AM', kind: 'period', subject: 'English', topic: 'Grammar', room: 'Room 203', accent: 'purple', iconName: 'book-outline' },
    { id: 'b1', startTime: '11:05 AM', endTime: '11:20 AM', kind: 'break', subject: 'Short Break', iconName: 'cafe-outline' },
    { id: 't4', periodNo: 4, startTime: '11:20 AM', endTime: '12:05 PM', kind: 'period', subject: 'Social Science', topic: 'Resources and Development', room: 'Room 205', accent: 'pink', iconName: 'globe-outline' },
    { id: 't5', periodNo: 5, startTime: '12:10 PM', endTime: '12:55 PM', kind: 'period', subject: 'Computer', topic: 'Python Basics', room: 'Lab 1', accent: 'teal', iconName: 'desktop-outline' },
    { id: 'b2', startTime: '12:55 PM', endTime: '01:45 PM', kind: 'break', subject: 'Lunch Break', iconName: 'restaurant-outline' },
    { id: 't6', periodNo: 6, startTime: '01:45 PM', endTime: '02:30 PM', kind: 'period', subject: 'Physical Education', topic: 'Fitness Training', room: 'Ground', accent: 'orange', iconName: 'walk-outline' },
    { id: 't7', periodNo: 7, startTime: '02:35 PM', endTime: '03:20 PM', kind: 'period', subject: 'Art', topic: 'Creative Drawing', room: 'Room 107', accent: 'green', iconName: 'color-palette-outline' },
  ],
  tue: [
    { id: 'tt1', periodNo: 1, startTime: '08:30 AM', endTime: '09:15 AM', kind: 'period', subject: 'Mathematics', topic: 'Linear Equations', room: 'Room 201', accent: 'blue', iconName: 'calculator-outline' },
    { id: 'tt2', periodNo: 2, startTime: '09:20 AM', endTime: '10:05 AM', kind: 'period', subject: 'Science', topic: 'Microorganisms', room: 'Room 204', accent: 'green', iconName: 'flask-outline' },
    { id: 'tb1', startTime: '10:05 AM', endTime: '10:20 AM', kind: 'break', subject: 'Short Break', iconName: 'cafe-outline' },
    { id: 'tt3', periodNo: 3, startTime: '10:20 AM', endTime: '11:05 AM', kind: 'period', subject: 'Hindi', topic: 'Poetry', room: 'Room 208', accent: 'orange', iconName: 'book-outline' },
  ],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
};
