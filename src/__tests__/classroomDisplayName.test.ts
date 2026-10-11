import { resolveClassroomDisplayName } from '../utils/classroomDisplayName';

describe('resolveClassroomDisplayName', () => {
  it('uses authorized lookup instead of opaque class id', () => {
    const lookup = new Map([['class_b3261be7', '4A-Telugu']]);
    expect(
      resolveClassroomDisplayName('class_b3261be7', {
        lookup,
      }),
    ).toBe('4A-Telugu');
  });

  it('never returns raw class_* id when lookup missing', () => {
    expect(resolveClassroomDisplayName('class_b3261be7', {})).toBe('Unknown Class');
  });
});
