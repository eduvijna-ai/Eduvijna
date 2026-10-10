describe('web navigation replace semantics', () => {
  it('replace swaps active entry without growing stack depth', () => {
    const stack: string[] = ['dashboard'];
    let active = 'document-home';
    const push = (screen: string) => {
      stack.push(active);
      active = screen;
    };
    const replace = (screen: string) => {
      active = screen;
    };
    push('document-preview');
    expect(stack).toEqual(['dashboard']);
    expect(active).toBe('document-preview');
    replace('worksheet');
    expect(stack).toEqual(['dashboard']);
    expect(active).toBe('worksheet');
  });
});
