import {
  __resetImageCropSessionForTests,
  getPendingCropUri,
  openImageCropper,
  resolveCropSession,
  subscribeCropSession,
} from '../core/services/imageCropSession';

describe('imageCropSession lifecycle', () => {
  beforeEach(() => {
    __resetImageCropSessionForTests();
  });

  it('notifies subscribers then resolves caller (modal hide before await continues)', async () => {
    const order: string[] = [];
    subscribeCropSession(() => {
      order.push(`notify:${getPendingCropUri() ? 'open' : 'closed'}`);
    });

    const pending = openImageCropper('file:///a.jpg');
    expect(getPendingCropUri()).toBe('file:///a.jpg');
    expect(order[0]).toBe('notify:open');

    const done = pending.then((result) => {
      order.push(`resolved:${result.kind}`);
      // While the caller's continuation runs, modal must already be closed.
      expect(getPendingCropUri()).toBeNull();
    });

    resolveCropSession({
      kind: 'cropped',
      uri: 'file:///a_crop.jpg',
      mimeType: 'image/jpeg',
      fileName: 'a_crop.jpg',
      width: 10,
      height: 10,
    });
    order.push('after-resolve-call');

    await done;
    expect(order).toEqual([
      'notify:open',
      'notify:closed',
      'after-resolve-call',
      'resolved:cropped',
    ]);
  });

  it('blocks overlapping open while a resolve is in flight', async () => {
    const first = openImageCropper('file:///one.jpg');
    resolveCropSession({ kind: 'cancelled' });
    const second = await openImageCropper('file:///two.jpg');
    // Second open during resolving microtask window cancels.
    expect(second.kind).toBe('cancelled');
    await expect(first).resolves.toEqual({ kind: 'cancelled' });
  });

  it('starting a new crop cancels the previous pending session', async () => {
    const first = openImageCropper('file:///old.jpg');
    // After resolving lock clears, a new open cancels prior.
    await Promise.resolve();
    await Promise.resolve();
    const secondPromise = openImageCropper('file:///new.jpg');
    await expect(first).resolves.toEqual({ kind: 'cancelled' });
    expect(getPendingCropUri()).toBe('file:///new.jpg');
    resolveCropSession({ kind: 'retake' });
    await expect(secondPromise).resolves.toEqual({ kind: 'retake' });
  });
});
