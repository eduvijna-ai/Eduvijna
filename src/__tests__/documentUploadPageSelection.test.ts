import { remapPageSelectionAfterDelete } from '../core/services/documentUploadApi';

describe('document upload page selection', () => {
  it('remaps selected pages after a page is removed', () => {
    const selected = new Set([1, 2, 4]);
    const next = remapPageSelectionAfterDelete(selected, 2);
    expect(Array.from(next).sort()).toEqual([1, 3]);
  });

  it('drops the removed page from selection', () => {
    const selected = new Set([3]);
    const next = remapPageSelectionAfterDelete(selected, 3);
    expect(next.size).toBe(0);
  });
});
