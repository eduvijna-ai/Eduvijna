import { DOCUMENT_IMAGE_MAX_EDGE } from '../core/services/documentImageUtils';

describe('document image normalize contract', () => {
  it('exports a stable max edge for aspect-preserving compress', () => {
    expect(DOCUMENT_IMAGE_MAX_EDGE).toBe(1600);
  });
});
