import {
  createPendingLifecycleSnapshot,
  reducePendingLifecycle,
  selectPostLoginResumeTarget,
} from '../core/navigation/mobileOpenQuizPendingLifecycle';

describe('mobileOpenQuizPending lifecycle (signed-out cold link order)', () => {
  it('queues on URI, survives auth hydration, resumes only after authenticated stack ready', () => {
    let s = createPendingLifecycleSnapshot();
    s = reducePendingLifecycle(s, {
      type: 'queue',
      sessionId: 'sess-479',
      quizId: '479',
      source: 'initial_deep_link_signed_out',
    });
    expect(s.pending?.sessionId).toBe('sess-479');
    expect(selectPostLoginResumeTarget(s)).toBeNull();

    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: false });
    expect(s.pending?.sessionId).toBe('sess-479');

    s = reducePendingLifecycle(s, { type: 'navigation_ready', ready: true });
    s = reducePendingLifecycle(s, { type: 'auth_nav_ready', ready: true });
    expect(selectPostLoginResumeTarget(s)).toBeNull();

    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: true });
    s = reducePendingLifecycle(s, { type: 'auth_nav_ready', ready: false });
    expect(selectPostLoginResumeTarget(s)).toBeNull();

    s = reducePendingLifecycle(s, { type: 'auth_nav_ready', ready: true });
    const target = selectPostLoginResumeTarget(s);
    expect(target).toEqual({
      sessionId: 'sess-479',
      quizId: '479',
      source: 'initial_deep_link_signed_out',
    });

    s = reducePendingLifecycle(s, { type: 'resume_started', sessionId: 'sess-479' });
    expect(selectPostLoginResumeTarget(s)).toBeNull();

    s = reducePendingLifecycle(s, { type: 'resume_finished', sessionId: 'sess-479', success: true });
    expect(s.pending).toBeNull();
  });

  it('clears pending on explicit logout, not on signed-out hydration', () => {
    let s = createPendingLifecycleSnapshot({
      pending: { sessionId: 'a', source: 'deep_link' },
      isAuthenticated: true,
      wasAuthenticated: true,
    });
    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: false });
    expect(s.pending).toBeNull();
  });

  it('restores from storage after process relaunch (Maestro stopApp) before login', () => {
    let s = createPendingLifecycleSnapshot();
    s = reducePendingLifecycle(s, {
      type: 'hydrate',
      sessionId: 'sess-479',
      quizId: '479',
      source: 'storage_hydrate',
    });
    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: false });
    s = reducePendingLifecycle(s, { type: 'navigation_ready', ready: true });
    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: true });
    s = reducePendingLifecycle(s, { type: 'auth_nav_ready', ready: true });
    expect(selectPostLoginResumeTarget(s)?.sessionId).toBe('sess-479');
  });

  it('preserves pending through failed login (no resume_finished success)', () => {
    let s = createPendingLifecycleSnapshot({
      pending: { sessionId: 'sess-479', source: 'deep_link' },
      isAuthenticated: false,
      navigationReady: true,
      authenticatedNavReady: true,
    });
    s = reducePendingLifecycle(s, { type: 'auth_changed', isAuthenticated: true });
    s = reducePendingLifecycle(s, { type: 'resume_started', sessionId: 'sess-479' });
    s = reducePendingLifecycle(s, {
      type: 'resume_finished',
      sessionId: 'sess-479',
      success: false,
    });
    expect(s.pending?.sessionId).toBe('sess-479');
    expect(s.resumeInFlightSessionId).toBeNull();
  });
});
