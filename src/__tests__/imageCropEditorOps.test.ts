import { isNearlyFullCrop, normalizeQuarterTurns } from '../core/utils/imageCropEditorOps';

describe('imageCropEditorOps', () => {
  const bounds = { x: 10, y: 20, width: 200, height: 300 };

  it('detects nearly-full crop within tolerance', () => {
    expect(isNearlyFullCrop({ ...bounds }, bounds)).toBe(true);
    expect(isNearlyFullCrop({ x: 12, y: 22, width: 198, height: 298 }, bounds)).toBe(true);
    expect(isNearlyFullCrop({ x: 40, y: 20, width: 160, height: 300 }, bounds)).toBe(false);
  });

  it('normalizes quarter turns into 0..3 (four turns restore orientation)', () => {
    expect(normalizeQuarterTurns(0)).toBe(0);
    expect(normalizeQuarterTurns(1)).toBe(1);
    expect(normalizeQuarterTurns(4)).toBe(0);
    expect(normalizeQuarterTurns(-1)).toBe(3);
    expect(normalizeQuarterTurns(7)).toBe(3);
  });
});
