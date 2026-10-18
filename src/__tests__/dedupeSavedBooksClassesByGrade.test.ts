import { dedupeSavedBooksClassesByGrade } from '../core/services/savedBooksContent.service';

describe('dedupeSavedBooksClassesByGrade', () => {
  it('keeps one option per normalized grade code', () => {
    const deduped = dedupeSavedBooksClassesByGrade([
      { id: 9, label: 'Class 9' },
      { id: 90, label: '9' },
      { id: 10, label: 'Class 10' },
      { id: 100, label: 'Grade 10' },
      { id: 11, label: 'Class 11' },
    ]);
    expect(deduped.map((c) => c.id)).toEqual([9, 10, 11]);
  });
});
