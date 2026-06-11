/** Student mock fixtures — assignments + assignment performance. */

import type {
  StudentAssignment,
  SubjectPerformance,
} from '../../types/student';

export const assignmentStats = {
  total: 8,
  submitted: 3,
  pending: 3,
  overdue: 2,
};

export const studentAssignments: StudentAssignment[] = [
  { id: 'ag1', title: 'Maths – Linear Equations', subject: 'Mathematics', description: 'Solve the worksheet on linear equations and upload your answers.', icon: 'book-outline', accent: 'blue', dueLabel: 'Due: 25 Apr 2025, 11:59 PM', status: 'pending' },
  { id: 'ag2', title: 'Science – Plant Cells', subject: 'Science', description: 'Draw a well-labeled diagram of plant cell and submit.', icon: 'flask-outline', accent: 'green', dueLabel: 'Due: 26 Apr 2025, 11:59 PM', status: 'pending' },
  { id: 'ag3', title: 'English – Essay Writing', subject: 'English', description: 'Write an essay on "My Favorite Teacher" in 300 words.', icon: 'document-text-outline', accent: 'purple', dueLabel: 'Due: 28 Apr 2025, 11:59 PM', status: 'submitted', submittedLabel: 'Submitted on 24 Apr 2025' },
  { id: 'ag4', title: 'Social Science – Our Environment', subject: 'Social Science', description: 'Answer the given questions from Chapter 3 in your notebook.', icon: 'globe-outline', accent: 'red', dueLabel: 'Due: 20 Apr 2025, 11:59 PM', status: 'overdue' },
  { id: 'ag5', title: 'Hindi – पत्र लेखन', subject: 'Hindi', description: 'मित्र को परीक्षा की तैयारी के लिए पत्र लिखिए।', icon: 'document-outline', accent: 'blue', dueLabel: 'Submitted on 18 Apr 2025', status: 'submitted', submittedLabel: 'Submitted on 18 Apr 2025' },
  { id: 'ag6', title: 'Maths – Linear Equations', subject: 'Mathematics', description: 'Periodic worksheet graded by Mr. Sharma.', icon: 'book-outline', accent: 'blue', dueLabel: 'Due: 25 Apr 2025', status: 'graded', submittedLabel: 'Submitted on 24 Apr 2025', marks: 18, maxMarks: 20 },
  { id: 'ag7', title: 'Science – Plant Cells', subject: 'Science', description: 'Plant cell diagram graded by Ms. Verma.', icon: 'flask-outline', accent: 'green', dueLabel: 'Due: 26 Apr 2025', status: 'graded', submittedLabel: 'Submitted on 24 Apr 2025', marks: 16, maxMarks: 20 },
];

export const performanceStats = {
  total: 18,
  submitted: 12,
  graded: 10,
  averageScore: 83,
};

export const performanceDistribution = [
  { label: 'Excellent (90-100%)', count: 4, color: 'success' as const },
  { label: 'Good (75-89%)', count: 6, color: 'info' as const },
  { label: 'Average (50-74%)', count: 0, color: 'warning' as const },
  { label: 'Needs Improvement (<50%)', count: 0, color: 'danger' as const },
];

export const subjectPerformance: SubjectPerformance[] = [
  { id: 'sp1', subject: 'Mathematics', icon: 'book-outline', accent: 'blue', completed: 4, total: 5, percent: 80 },
  { id: 'sp2', subject: 'Science', icon: 'flask-outline', accent: 'green', completed: 3, total: 4, percent: 85 },
  { id: 'sp3', subject: 'English', icon: 'document-text-outline', accent: 'purple', completed: 2, total: 3, percent: 90 },
  { id: 'sp4', subject: 'Social Science', icon: 'globe-outline', accent: 'orange', completed: 1, total: 2, percent: 70 },
  { id: 'sp5', subject: 'Hindi', icon: 'language-outline', accent: 'red', completed: 2, total: 4, percent: 75 },
];
