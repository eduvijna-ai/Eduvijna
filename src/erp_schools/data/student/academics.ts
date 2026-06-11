/** Student mock fixtures — academics (subject marks, distribution, detailed report). */

import type {
  SubjectMark,
  MarksDistributionBand,
  TermScorePoint,
  AssessmentBreakdownRow,
  AssessmentDetailItem,
} from '../../types/student';

export const academicSummary = {
  overallAverage: 85.6,
  rank: 3,
  classStrength: 32,
  subjects: 8,
  improvement: 8.4,
};

export const subjectMarks: SubjectMark[] = [
  { id: 'eng', subject: 'English', icon: 'book-outline', accent: 'blue', periodicTest: '17/20', notebook: '9/10', enrichment: '8/10', examination: '52/60', total: '86/100', percent: 86, grade: 'A' },
  { id: 'math', subject: 'Mathematics', icon: 'calculator-outline', accent: 'orange', periodicTest: '18/20', notebook: '9/10', enrichment: '9/10', examination: '50/60', total: '86/100', percent: 86, grade: 'A' },
  { id: 'sci', subject: 'Science', icon: 'flask-outline', accent: 'green', periodicTest: '16/20', notebook: '9/10', enrichment: '8/10', examination: '54/60', total: '87/100', percent: 87, grade: 'A+' },
  { id: 'sst', subject: 'Social Science', icon: 'globe-outline', accent: 'purple', periodicTest: '15/20', notebook: '9/10', enrichment: '8/10', examination: '48/60', total: '80/100', percent: 80, grade: 'A' },
  { id: 'hin', subject: 'Hindi', icon: 'language-outline', accent: 'red', periodicTest: '17/20', notebook: '8/10', enrichment: '8/10', examination: '51/60', total: '84/100', percent: 84, grade: 'A' },
  { id: 'cs', subject: 'Computer', icon: 'desktop-outline', accent: 'teal', periodicTest: '18/20', notebook: '10/10', enrichment: '9/10', examination: '55/60', total: '92/100', percent: 92, grade: 'A+' },
  { id: 'sans', subject: 'Sanskrit', icon: 'leaf-outline', accent: 'orange', periodicTest: '16/20', notebook: '9/10', enrichment: '9/10', examination: '50/60', total: '84/100', percent: 84, grade: 'A' },
  { id: 'pe', subject: 'Physical Education', icon: 'football-outline', accent: 'pink', periodicTest: '19/20', notebook: '10/10', enrichment: '10/10', examination: '56/60', total: '95/100', percent: 95, grade: 'A+' },
];

export const marksDistribution: MarksDistributionBand[] = [
  { range: '90 - 100%', count: 5, color: 'success' },
  { range: '75 - 89%', count: 2, color: 'info' },
  { range: '60 - 74%', count: 1, color: 'warning' },
  { range: 'Below 60%', count: 0, color: 'danger' },
];

export const termComparison: TermScorePoint[] = [
  { label: 'Term 1', percent: 72.1 },
  { label: 'Term 2', percent: 77.2 },
  { label: 'Term 3', percent: 85.6 },
];

export const detailedReportSummary = {
  totalMarks: 86,
  outOf: 100,
  percentage: 86,
  grade: 'A',
  classAverage: 72,
  highestInClass: 95,
};

export const assessmentBreakdown: AssessmentBreakdownRow[] = [
  { type: 'Periodic Test (20%)', maxMarks: 20, obtained: 17, percent: 85, grade: 'A' },
  { type: 'Notebook (10%)', maxMarks: 10, obtained: 9, percent: 90, grade: 'A+' },
  { type: 'Subject Enrichment (10%)', maxMarks: 10, obtained: 8, percent: 80, grade: 'A' },
  { type: 'Examination (60%)', maxMarks: 60, obtained: 52, percent: 86.7, grade: 'A' },
];

export const assessmentDetails: AssessmentDetailItem[] = [
  { id: 'as1', title: 'PT-1: Reading Comprehension', type: 'Periodic Test', icon: 'reader-outline', accent: 'purple', obtained: 18, maxMarks: 20, percent: 90, grade: 'A+' },
  { id: 'as2', title: 'PT-2: Grammar and Vocabulary', type: 'Periodic Test', icon: 'reader-outline', accent: 'purple', obtained: 16, maxMarks: 20, percent: 80, grade: 'A' },
  { id: 'as3', title: 'Notebook Submission', type: 'Notebook', icon: 'document-outline', accent: 'orange', obtained: 9, maxMarks: 10, percent: 90, grade: 'A+' },
  { id: 'as4', title: 'Poem Recitation', type: 'Subject Enrichment', icon: 'bulb-outline', accent: 'orange', obtained: 8, maxMarks: 10, percent: 80, grade: 'A' },
  { id: 'as5', title: 'Term Examination', type: 'Examination', icon: 'clipboard-outline', accent: 'green', obtained: 52, maxMarks: 60, percent: 86.7, grade: 'A' },
];
