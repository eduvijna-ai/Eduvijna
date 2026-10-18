import { resolvePersonDisplayName } from '../erp/utils/personDisplayName';

describe('resolvePersonDisplayName', () => {
  it('prefers student_name over id fallback', () => {
    expect(
      resolvePersonDisplayName(
        { id: 16, student_name: 'Aarya', admission_number: 'ADM-1' },
        'Student',
        16,
      ),
    ).toBe('Aarya');
  });

  it('joins first and last name when full_name missing', () => {
    expect(
      resolvePersonDisplayName({ first_name: 'Ridhima', last_name: 'P' }, 'Student'),
    ).toBe('Ridhima P');
  });

  it('falls back to labeled id only when no name fields exist', () => {
    expect(resolvePersonDisplayName({ id: 16 }, 'Student', 16)).toBe('Student #16');
  });
});
