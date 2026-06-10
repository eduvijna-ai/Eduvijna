/** Mock fixtures — study materials / resource library. */

import type { StudyMaterialItem } from '../types/domain';

export const studyMaterials: StudyMaterialItem[] = [
  { id: 'm1', title: 'Cell Structure - Notes', type: 'pdf', sizeLabel: '1.2 MB', date: '12 May 2025', author: 'By You', sharedWithClass: true },
  { id: 'm2', title: 'Introduction to Microorganisms', type: 'ppt', sizeLabel: '3.5 MB', date: '10 May 2025', author: 'By You', sharedWithClass: true },
  { id: 'm3', title: 'Cell Structure - Worksheet', type: 'doc', sizeLabel: '245 KB', date: '08 May 2025', author: 'By You', sharedWithClass: true },
  { id: 'm4', title: 'Cell Division - Animation Video', type: 'video', sizeLabel: '24.6 MB', date: '07 May 2025', author: 'By You', sharedWithClass: true },
  { id: 'm5', title: 'Science Quiz - Chapter 5', type: 'link', sizeLabel: 'Link', date: '06 May 2025', author: 'By You', sharedWithClass: true },
];

export const materialsStorage = {
  usedLabel: '120 MB',
  totalLabel: '5 GB',
  usedPercent: 2.3,
};

export const resourceLibrary: StudyMaterialItem[] = [
  { id: 'r1', title: 'NCERT Science Class 8 — Full Book', type: 'pdf', sizeLabel: '18 MB', date: '01 May 2025', author: 'School Resources', sharedWithClass: false },
  { id: 'r2', title: 'Lab Safety Guidelines', type: 'pdf', sizeLabel: '0.8 MB', date: '28 Apr 2025', author: 'School Resources', sharedWithClass: false },
  { id: 'r3', title: 'Periodic Table — Interactive', type: 'link', sizeLabel: 'Link', date: '20 Apr 2025', author: 'School Resources', sharedWithClass: false },
];
