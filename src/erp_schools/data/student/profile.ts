/** Student mock fixtures — profile (the signed-in student persona). */

import type { StudentProfile } from '../../types/student';

export const studentProfile: StudentProfile = {
  name: 'Aarav Kumar',
  className: 'Class 7-B',
  rollNo: '23',
  admissionNo: '2024/7B/023',
  academicYear: '2024-25',
  attendancePercent: 88,
  averageMarks: 85.6,
  classRank: 3,
  classStrength: 32,
  guardianName: 'Priya Sharma',
  dateOfBirth: '14 Aug 2012',
  bloodGroup: 'B+',
  email: 'aarav.kumar@eduvijna.com',
  phone: '+91 98765 12345',
  address: '12, Green Park Avenue, Bengaluru 560001',
};

export const academicYears = ['2024-25', '2023-24', '2022-23'];
