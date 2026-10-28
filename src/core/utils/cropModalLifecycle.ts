/**
 * Crop modal dismissal helpers.
 * Fabric NativeAnimatedNodesManager can throw when a Modal unmounts while an
 * ActivityIndicator (Native Animated) is still connecting/disconnecting nodes.
 *
 * Root cause evidence (emulator logcat):
 * JSApplicationIllegalArgumentException:
 * disconnectAnimatedNodeFromView: Animated node with tag […] does not exist
 */

import { InteractionManager } from 'react-native';

function waitTwoAnimationFrames(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      setTimeout(resolve, 16);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Wait until JS interactions settle, then two animation frames. */
export async function waitForSafeModalDismiss(): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      InteractionManager.runAfterInteractions(() => resolve());
    } catch {
      resolve();
    }
  });
  await waitTwoAnimationFrames();
}
