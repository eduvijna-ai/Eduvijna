/**
 * @jest-environment node
 */
import { waitForSafeModalDismiss } from '../core/utils/cropModalLifecycle';

describe('waitForSafeModalDismiss', () => {
  it('resolves after interaction flush and animation frames', async () => {
    const raf: Array<FrameRequestCallback> = [];
    const originalRaf = global.requestAnimationFrame;
    const originalCancel = global.cancelAnimationFrame;

    global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      raf.push(cb);
      return raf.length;
    }) as typeof requestAnimationFrame;
    global.cancelAnimationFrame = (() => undefined) as typeof cancelAnimationFrame;

    const pending = waitForSafeModalDismiss();
    // InteractionManager mock from RN may schedule sync or async; drain frames.
    for (let i = 0; i < 5 && raf.length > 0; i += 1) {
      const cb = raf.shift();
      cb?.(i);
    }
    // Also allow microtask/timeout fallbacks.
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < 5 && raf.length > 0; i += 1) {
      const cb = raf.shift();
      cb?.(i);
    }

    await expect(pending).resolves.toBeUndefined();

    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancel;
  });
});
