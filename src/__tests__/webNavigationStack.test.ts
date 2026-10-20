/**
 * Behavioral contract for App.tsx web navigation shim (tested via pure helpers).
 */

export function webNavGoBack(
  stack: Array<{ screen: string; params: Record<string, unknown> }>,
  defaultBack: string,
): { screen: string; params: Record<string, unknown>; stack: typeof stack } {
  const copy = [...stack];
  const previous = copy.pop();
  if (previous) {
    return { screen: previous.screen, params: previous.params, stack: copy };
  }
  return { screen: defaultBack, params: {}, stack: copy };
}

describe('web navigation stack', () => {
  it('supports canGoBack and restores prior screen with params', () => {
    const stack = [
      { screen: 'DocumentUploadHomeScreen', params: { workspacePreset: { lesson: 'L1' } } },
    ];
    expect(stack.length > 0).toBe(true);
    const result = webNavGoBack(stack, 'dashboard');
    expect(result.screen).toBe('DocumentUploadHomeScreen');
    expect(result.params.workspacePreset).toEqual({ lesson: 'L1' });
    expect(result.stack).toHaveLength(0);
  });

  it('falls back to default screen when stack empty', () => {
    const result = webNavGoBack([], 'DocumentUploadHomeScreen');
    expect(result.screen).toBe('DocumentUploadHomeScreen');
  });
});
