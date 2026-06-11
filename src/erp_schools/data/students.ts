/** Mock fixtures — students + class roster. */

import type { StudentInfo, AttendanceStatus } from '../types/domain';

const firstNames = [
  'Aarav', 'Ananya', 'Kabir', 'Diya', 'Rohan', 'Mehak', 'Vivaan', 'Ishita',
  'Arjun', 'Saanvi', 'Reyansh', 'Aadhya', 'Vihaan', 'Anika', 'Krishna', 'Myra',
  'Ayaan', 'Pari', 'Atharv', 'Navya', 'Shaurya', 'Kiara', 'Dhruv', 'Riya',
  'Aryan', 'Sara', 'Kabeer', 'Tara', 'Ved', 'Aisha', 'Yuvan', 'Zara',
];
const lastNames = ['Sharma', 'Verma', 'Singh', 'Patel', 'Gupta', 'Joshi', 'Mehta', 'Reddy', 'Nair', 'Iyer'];

const statuses: AttendanceStatus[] = ['present', 'present', 'present', 'present', 'absent', 'late', 'present', 'leave'];

function buildRoster(classCode: string, count: number, startRoll: number): StudentInfo[] {
  return Array.from({ length: count }, (_, i) => {
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    return {
      id: `${classCode}-s${i + 1}`,
      rollNo: `S${startRoll + i}`,
      name,
      classCode,
      attendanceStatus: statuses[i % statuses.length],
      attendancePercent: 78 + ((i * 7) % 22),
      averageScore: 55 + ((i * 11) % 45),
      guardianName: `${i % 2 === 0 ? 'Mrs.' : 'Mr.'} ${lastNames[i % lastNames.length]}`,
      guardianRelation: i % 2 === 0 ? 'Mother' : 'Father',
    };
  });
}

export const rosterByClass: Record<string, StudentInfo[]> = {
  '8-A': buildRoster('8-A', 32, 8123),
  '8-B': buildRoster('8-B', 30, 8201),
  '9-A': buildRoster('9-A', 34, 9101),
  '9-B': buildRoster('9-B', 33, 9201),
  '10-A': buildRoster('10-A', 33, 10101),
};

export const allStudents: StudentInfo[] = Object.values(rosterByClass).flat();
