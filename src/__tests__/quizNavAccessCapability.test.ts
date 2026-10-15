import {
  hasQuizNavCapability,
  resolveQuizNavCapabilityForScreen,
  resolveQuizNavCapabilityFromApiItem,
  resolveQuizNavCapabilitiesFromNavItems,
} from '../core/domain/quizNavCapability';
import type { ResolvedNavItem } from '../core/hooks/useQuizNavItems';

const documentApiRow = {
  id: 178,
  route_path: '/document-quiz',
  component_name: 'DocumentQuizPage',
  label: 'Document',
  role_id: 3,
  school_id: 7,
  role: 'instructor',
  display_order: 2,
};

const handwrittenApiRow = {
  id: 169,
  route_path: '/handwritten',
  component_name: 'HandwrittenWorkspace',
  label: 'Handwritten',
  role_id: 3,
  school_id: 7,
  role: 'instructor',
  display_order: 3,
};

const aiApiRow = {
  id: 1,
  route_path: '/ai-assessment',
  component_name: 'CreateAIQuizScreen',
  label: 'AI Assessment',
  display_order: 0,
};

function navItem(screen: string, display_order = 0): ResolvedNavItem {
  return {
    screen,
    label: screen,
    subtitle: '',
    iconName: 'apps',
    iconColor: '#000',
    bgColor: '#fff',
    display_order,
  };
}

describe('quiz nav capability resolver', () => {
  it('A: /document-quiz DocumentQuizPage resolves to document capability', () => {
    expect(resolveQuizNavCapabilityFromApiItem(documentApiRow as any)).toBe('document');
  });

  it('B: DocumentUploadHomeScreen is allowed when document nav row is present', () => {
    const items = [navItem('DocumentUploadHomeScreen')];
    expect(hasQuizNavCapability('document', items)).toBe(true);
    expect(resolveQuizNavCapabilityForScreen('DocumentUploadHomeScreen')).toBe('document');
  });

  it('C: CreateDocumentQuizScreen shares document capability with DocumentUploadHomeScreen', () => {
    const items = [navItem('DocumentUploadHomeScreen')];
    expect(hasQuizNavCapability('document', items)).toBe(true);
    expect(resolveQuizNavCapabilityForScreen('CreateDocumentQuizScreen')).toBe('document');
  });

  it('D: AssessmentWorkspaceScreen(document) requires document only', () => {
    const docOnly = [navItem('DocumentUploadHomeScreen')];
    const hwOnly = [navItem('CreateHandwrittenQuizScreen')];
    expect(
      hasQuizNavCapability(
        resolveQuizNavCapabilityForScreen('AssessmentWorkspaceScreen', {
          workspaceMode: 'document',
        })!,
        docOnly,
      ),
    ).toBe(true);
    expect(
      hasQuizNavCapability(
        resolveQuizNavCapabilityForScreen('AssessmentWorkspaceScreen', {
          workspaceMode: 'document',
        })!,
        hwOnly,
      ),
    ).toBe(false);
  });

  it('E: AssessmentWorkspaceScreen(handwritten) requires handwritten only', () => {
    const docOnly = [navItem('DocumentUploadHomeScreen')];
    const hwOnly = [navItem('CreateHandwrittenQuizScreen')];
    expect(
      hasQuizNavCapability(
        resolveQuizNavCapabilityForScreen('AssessmentWorkspaceScreen', {
          workspaceMode: 'handwritten',
        })!,
        hwOnly,
      ),
    ).toBe(true);
    expect(
      hasQuizNavCapability(
        resolveQuizNavCapabilityForScreen('AssessmentWorkspaceScreen', {
          workspaceMode: 'handwritten',
        })!,
        docOnly,
      ),
    ).toBe(false);
  });

  it('F: document does not grant handwritten', () => {
    const caps = resolveQuizNavCapabilitiesFromNavItems([navItem('DocumentUploadHomeScreen')]);
    expect(caps.has('document')).toBe(true);
    expect(caps.has('handwritten')).toBe(false);
  });

  it('G: handwritten does not grant document', () => {
    const caps = resolveQuizNavCapabilitiesFromNavItems([
      navItem('CreateHandwrittenQuizScreen'),
    ]);
    expect(caps.has('handwritten')).toBe(true);
    expect(caps.has('document')).toBe(false);
  });

  it('H: authoritative API rows without document exclude document tiles', () => {
    const items = [navItem('CreateAIQuizScreen'), navItem('CreateImageQuizScreen')];
    expect(hasQuizNavCapability('document', items)).toBe(false);
    expect(hasQuizNavCapability('ai', items)).toBe(true);
  });

  it('I: AI and image capabilities stay independent', () => {
    expect(resolveQuizNavCapabilityFromApiItem(aiApiRow as any)).toBe('ai');
    expect(resolveQuizNavCapabilityFromApiItem(handwrittenApiRow as any)).toBe('handwritten');
    const mixed = [
      navItem('CreateAIQuizScreen'),
      navItem('CreateImageQuizScreen'),
      navItem('CreateYouTubeQuizScreen'),
    ];
    const caps = resolveQuizNavCapabilitiesFromNavItems(mixed);
    expect(caps.has('ai')).toBe(true);
    expect(caps.has('image')).toBe(true);
    expect(caps.has('youtube')).toBe(true);
    expect(caps.has('document')).toBe(false);
  });
});
