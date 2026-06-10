/** Mock fixtures — assignments + submissions. */

import type { Assignment, AssignmentSubmission } from '../types/domain';
import { rosterByClass } from './students';

export const assignments: Assignment[] = [
  { id: 'as1', title: 'Cell Structure Worksheet', classCode: '8-A', subject: 'Science', dueDate: '20 May 2025', status: 'active', submitted: 27, pending: 4, total: 32 },
  { id: 'as2', title: 'Algebra Practice Set 3', classCode: '8-A', subject: 'Mathematics', dueDate: '18 May 2025', status: 'active', submitted: 20, pending: 12, total: 32 },
  { id: 'as3', title: 'Essay: My Favourite Book', classCode: '9-A', subject: 'English', dueDate: '15 May 2025', status: 'closed', submitted: 34, pending: 0, total: 34 },
  { id: 'as4', title: 'Photosynthesis Diagram', classCode: '9-B', subject: 'Science', dueDate: '25 May 2025', status: 'scheduled', submitted: 0, pending: 33, total: 33 },
  { id: 'as5', title: 'Chapter 6 Notes', classCode: '10-A', subject: 'Science', dueDate: '—', status: 'draft', submitted: 0, pending: 33, total: 33 },
];

export const assignmentsSummary = {
  active: 2,
  closed: 1,
  scheduled: 1,
  drafts: 1,
};

export function submissionsFor(assignmentId: string): AssignmentSubmission[] {
  const assignment = assignments.find((a) => a.id === assignmentId);
  const roster = (assignment && rosterByClass[assignment.classCode]) || rosterByClass['8-A'];
  const maxMarks = 20;
  return roster.slice(0, 12).map((student, i) => {
    const status: AssignmentSubmission['status'] =
      i % 5 === 4 ? 'pending' : i % 5 === 3 ? 'late' : i % 3 === 0 ? 'graded' : 'submitted';
    return {
      id: `${assignmentId}-sub-${student.id}`,
      student,
      submittedAt: status === 'pending' ? undefined : `1${i % 8} May 2025`,
      status,
      marks: status === 'graded' ? 12 + (i % 8) : undefined,
      maxMarks,
    };
  });
}
