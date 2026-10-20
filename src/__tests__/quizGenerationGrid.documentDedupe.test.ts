import {
  resolveQuizNavCapabilityForScreen,
  resolveQuizNavCapabilitiesFromNavItems,
} from '../core/domain/quizNavCapability';
import type { ResolvedNavItem } from '../core/hooks/useQuizNavItems';

/**
 * Mirrors QuizGenerationGrid capability dedupe: API DocumentUploadHomeScreen
 * and expansion CreateDocumentQuizScreen / DocumentUploadHomeScreen share one
 * 'document' capability — Home must show exactly one Document tile.
 */
function dedupeByCapability(tiles: ResolvedNavItem[]): ResolvedNavItem[] {
  const seen = new Set<string>();
  const out: ResolvedNavItem[] = [];
  for (const tile of tiles) {
    const cap = resolveQuizNavCapabilityForScreen(tile.screen);
    if (cap) {
      if (seen.has(cap)) continue;
      seen.add(cap);
    }
    out.push(tile);
  }
  return out;
}

function tile(screen: string, label: string): ResolvedNavItem {
  return {
    screen,
    label,
    subtitle: 'Upload & books',
    iconName: 'document',
    iconColor: '#0F766E',
    bgColor: '#ECFEFF',
    display_order: 0,
  };
}

describe('Home Document tile capability dedupe', () => {
  it('collapses DocumentUploadHomeScreen + CreateDocumentQuizScreen to one document capability', () => {
    const input = [
      tile('DocumentUploadHomeScreen', 'Document'),
      tile('CreateDocumentQuizScreen', 'Document Quiz'),
      tile('CreateHandwrittenQuizScreen', 'Handwritten'),
    ];
    const caps = resolveQuizNavCapabilitiesFromNavItems(input);
    expect(caps.has('document')).toBe(true);
    expect(caps.has('handwritten')).toBe(true);

    const deduped = dedupeByCapability(input);
    const documentTiles = deduped.filter(
      (t) => resolveQuizNavCapabilityForScreen(t.screen) === 'document',
    );
    expect(documentTiles).toHaveLength(1);
    expect(documentTiles[0].screen).toBe('DocumentUploadHomeScreen');
    expect(deduped.filter((t) => t.label === 'Document Quiz')).toHaveLength(0);
  });

  it('does not drop handwritten when document is present', () => {
    const deduped = dedupeByCapability([
      tile('DocumentUploadHomeScreen', 'Document'),
      tile('CreateHandwrittenQuizScreen', 'Handwritten'),
    ]);
    expect(deduped.map((t) => t.screen)).toEqual([
      'DocumentUploadHomeScreen',
      'CreateHandwrittenQuizScreen',
    ]);
  });
});
