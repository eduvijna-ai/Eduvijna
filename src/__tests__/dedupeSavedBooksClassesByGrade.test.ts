import {
  dedupeSavedBooksClassesByGrade,
  normalizeSavedBooksClassOptions,
} from '../core/services/savedBooksContent.service';

describe('normalizeSavedBooksClassOptions', () => {
  it('preserves distinct IDs even when labels normalize to the same grade', () => {
    const out = normalizeSavedBooksClassOptions([
      { id: 9, label: 'Class 9' },
      { id: 90, label: '9' },
      { id: 10, label: 'Class 10' },
      { id: 100, label: 'Grade 10' },
      { id: 11, label: 'Class 11' },
    ]);
    expect(out.map((c) => c.id).sort((a, b) => a - b)).toEqual([9, 10, 11, 90, 100]);
  });

  it('collapses only exact duplicate IDs', () => {
    const out = normalizeSavedBooksClassOptions([
      { id: 10, label: 'Class 10' },
      { id: 10, label: 'Class 10' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(10);
  });

  it('disambiguates identical labels across different IDs', () => {
    const out = normalizeSavedBooksClassOptions([
      { id: 10, label: 'Class 10' },
      { id: 110, label: 'Class 10' },
    ]);
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.label.includes(`(#${c.id})`))).toBe(true);
  });

  it('legacy export delegates to normalizeSavedBooksClassOptions', () => {
    const items = [{ id: 1, label: 'Class 1' }];
    expect(dedupeSavedBooksClassesByGrade(items)).toEqual(
      normalizeSavedBooksClassOptions(items),
    );
  });
});
