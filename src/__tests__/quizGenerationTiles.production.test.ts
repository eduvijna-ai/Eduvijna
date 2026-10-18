import {
  resolveQuizGenerationNavigation,
  resolveQuizGenerationTiles,
} from '../core/utils/quizGenerationTiles';
import type { ResolvedNavItem } from '../core/hooks/useQuizNavItems';
import { resolveQuizNavCapabilityForScreen } from '../core/domain/quizNavCapability';

function tile(partial: Partial<ResolvedNavItem> & { screen: string; label: string }): ResolvedNavItem {
  return {
    subtitle: '',
    iconName: 'apps',
    iconColor: '#000',
    bgColor: '#fff',
    display_order: 0,
    ...partial,
  };
}

describe('resolveQuizGenerationTiles (production helper used by QuizGenerationGrid)', () => {
  it('dedupes API Document + platform expansion to exactly one Document card', () => {
    const tiles = resolveQuizGenerationTiles({
      fetchStatus: 'ready',
      navItems: [
        tile({
          screen: 'CreateHandwrittenQuizScreen',
          label: 'AI Assessment Platform',
          display_order: 0,
        }),
        tile({
          screen: 'DocumentUploadHomeScreen',
          label: 'Document',
          subtitle: 'Upload & books',
          display_order: 1,
        }),
      ],
    });

    const documentTiles = tiles.filter(
      (t) => resolveQuizNavCapabilityForScreen(t.screen) === 'document',
    );
    expect(documentTiles).toHaveLength(1);
    expect(documentTiles[0].screen).toBe('DocumentUploadHomeScreen');
    expect(documentTiles[0].label).toBe('Document');
    expect(tiles.some((t) => t.label === 'Document Quiz')).toBe(false);

    const handwritten = tiles.filter(
      (t) => resolveQuizNavCapabilityForScreen(t.screen) === 'handwritten',
    );
    expect(handwritten).toHaveLength(1);
  });

  it('fallback navigation still exposes Document and preserves handwritten access mapping', () => {
    const tiles = resolveQuizGenerationTiles({
      fetchStatus: 'error',
      navItems: [],
    });
    const doc = tiles.find((t) => t.screen === 'CreateDocumentQuizScreen');
    expect(doc?.label).toBe('Document');
    expect(resolveQuizGenerationNavigation('CreateDocumentQuizScreen')).toEqual({
      screen: 'AssessmentWorkspaceScreen',
      params: { mode: 'document' },
    });
    expect(resolveQuizGenerationNavigation('DocumentUploadHomeScreen')).toEqual({
      screen: 'AssessmentWorkspaceScreen',
      params: { mode: 'document' },
    });
    expect(resolveQuizGenerationNavigation('CreateHandwrittenQuizScreen')).toEqual({
      screen: 'AssessmentWorkspaceScreen',
      params: { mode: 'handwritten' },
    });
  });

  it('platform expansion alone yields one DocumentUploadHomeScreen Document tile', () => {
    const tiles = resolveQuizGenerationTiles({
      fetchStatus: 'ready',
      navItems: [
        tile({
          screen: 'CreateHandwrittenQuizScreen',
          label: 'AI Assessment Platform',
        }),
      ],
    });
    const docs = tiles.filter((t) => t.label === 'Document');
    expect(docs).toHaveLength(1);
    expect(docs[0].screen).toBe('DocumentUploadHomeScreen');
  });
});
