import {
  applyMySchoolToBrandingState,
  clearSchoolBrandingForAccountChange,
  EMPTY_SCHOOL_BRANDING,
  parseMySchoolResponse,
  shouldAcceptSchoolBrandingResponse,
} from '../core/utils/schoolBranding';
import { resolveLogoUrl, withLogoCacheBust } from '../core/utils/resolveLogoUrl';

describe('resolveLogoUrl', () => {
  it('prefixes relative /api paths with the API origin', () => {
    expect(resolveLogoUrl('/api/v1/school-management/schools/9/logo', 'https://eduapi.eduvijna.com')).toBe(
      'https://eduapi.eduvijna.com/api/v1/school-management/schools/9/logo',
    );
  });

  it('passes through absolute URLs and rejects empty', () => {
    expect(resolveLogoUrl('https://cdn.example/logo.png', 'https://eduapi.eduvijna.com')).toBe(
      'https://cdn.example/logo.png',
    );
    expect(resolveLogoUrl('  ', 'https://eduapi.eduvijna.com')).toBeUndefined();
    expect(resolveLogoUrl(null, 'https://eduapi.eduvijna.com')).toBeUndefined();
  });
});

describe('withLogoCacheBust', () => {
  it('appends a revision so same-path replacements revalidate', () => {
    const base = 'https://eduapi.eduvijna.com/api/v1/school-management/schools/9/logo';
    expect(withLogoCacheBust(base, 1)).toBe(`${base}?v=1`);
    expect(withLogoCacheBust(base, 2)).toBe(`${base}?v=2`);
    expect(withLogoCacheBust(`${base}?v=1`, 3)).toBe(`${base}?v=3`);
  });
});

describe('parseMySchoolResponse', () => {
  it('reads school_id, school_name, and logo_url from flat or nested payloads', () => {
    expect(
      parseMySchoolResponse({
        school_id: 42,
        school_name: 'Alpha Academy',
        logo_url: '/api/v1/school-management/schools/42/logo',
      }),
    ).toEqual({
      school_id: 42,
      school_name: 'Alpha Academy',
      logo_url: '/api/v1/school-management/schools/42/logo',
    });

    expect(
      parseMySchoolResponse({
        data: { school_id: 7, name: 'Beta', logo_url: '' },
      }),
    ).toEqual({
      school_id: 7,
      school_name: 'Beta',
      logo_url: null,
    });
  });
});

describe('account isolation for school branding', () => {
  it('rejects late responses after logout or account switch', () => {
    expect(
      shouldAcceptSchoolBrandingResponse({
        requestAccountId: 'a',
        currentAccountId: null,
      }),
    ).toBe(false);

    expect(
      shouldAcceptSchoolBrandingResponse({
        requestAccountId: 'a',
        currentAccountId: 'b',
      }),
    ).toBe(false);

    expect(
      shouldAcceptSchoolBrandingResponse({
        requestAccountId: 'a',
        currentAccountId: 'a',
        requestEpoch: 1,
        currentEpoch: 2,
      }),
    ).toBe(false);

    expect(
      shouldAcceptSchoolBrandingResponse({
        requestAccountId: 'a',
        currentAccountId: 'a',
        requestEpoch: 3,
        currentEpoch: 3,
      }),
    ).toBe(true);
  });

  it('clears School A branding immediately when switching to School B', () => {
    const schoolA = applyMySchoolToBrandingState(
      EMPTY_SCHOOL_BRANDING,
      {
        school_id: 1,
        school_name: 'School A',
        logo_url: '/api/v1/school-management/schools/1/logo',
      },
      'user-a',
    );

    const cleared = clearSchoolBrandingForAccountChange(schoolA, 'user-b');
    expect(cleared.accountId).toBe('user-b');
    expect(cleared.schoolName).toBe('');
    expect(cleared.logoUrlRaw).toBeNull();
    expect(cleared.loading).toBe(true);
    expect(cleared.revision).toBeGreaterThan(schoolA.revision);

    const loggedOut = clearSchoolBrandingForAccountChange(schoolA, null);
    expect(loggedOut).toMatchObject({
      accountId: null,
      schoolName: '',
      logoUrlRaw: null,
      loading: false,
    });
  });

  it('bumps revision on each successful fetch so same URL replacements refresh', () => {
    const first = applyMySchoolToBrandingState(
      EMPTY_SCHOOL_BRANDING,
      {
        school_id: 9,
        school_name: 'Demo School',
        logo_url: '/api/v1/school-management/schools/9/logo',
      },
      'user-1',
    );
    const second = applyMySchoolToBrandingState(
      first,
      {
        school_id: 9,
        school_name: 'Demo School',
        logo_url: '/api/v1/school-management/schools/9/logo',
      },
      'user-1',
    );
    expect(second.logoUrlRaw).toBe(first.logoUrlRaw);
    expect(second.revision).toBe(first.revision + 1);

    const absolute = resolveLogoUrl(second.logoUrlRaw, 'https://eduapi.eduvijna.com')!;
    expect(withLogoCacheBust(absolute, second.revision)).not.toBe(
      withLogoCacheBust(absolute, first.revision),
    );
  });

  it('restores fallback when logo is removed (null logo_url)', () => {
    const withLogo = applyMySchoolToBrandingState(
      EMPTY_SCHOOL_BRANDING,
      {
        school_id: 9,
        school_name: 'Demo School',
        logo_url: '/api/v1/school-management/schools/9/logo',
      },
      'user-1',
    );
    const removed = applyMySchoolToBrandingState(
      withLogo,
      {
        school_id: 9,
        school_name: 'Demo School',
        logo_url: null,
      },
      'user-1',
    );
    expect(removed.logoUrlRaw).toBeNull();
    expect(resolveLogoUrl(removed.logoUrlRaw, 'https://eduapi.eduvijna.com')).toBeUndefined();
  });
});
