import { isTauri } from '@tauri-apps/api/core';

export const PRESENTATION_CHROME_IDLE_MS = 1_400;

export type PresentationViewportMode = 'browser' | 'css' | 'native';

export function selectPresentationViewportMode(
  nativeAvailable: boolean,
  browserFullscreenAvailable: boolean,
): PresentationViewportMode {
  if (nativeAvailable) return 'native';
  if (browserFullscreenAvailable) return 'browser';
  return 'css';
}

export async function enterPresentationViewport(): Promise<PresentationViewportMode> {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setFullscreen(true);
      return 'native';
    } catch {
      return 'css';
    }
  }

  const root = document.documentElement;
  if (!document.fullscreenEnabled || typeof root.requestFullscreen !== 'function') {
    return 'css';
  }

  try {
    await root.requestFullscreen({ navigationUI: 'hide' });
    if ('fullscreenElement' in document && !document.fullscreenElement) return 'css';
    return 'browser';
  } catch {
    return 'css';
  }
}

export async function exitPresentationViewport(
  mode: PresentationViewportMode,
): Promise<void> {
  if (mode === 'native' && isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().setFullscreen(false);
    } catch {
      // The CSS presentation surface can still exit even if the native window call fails.
    }
    return;
  }

  if (mode === 'browser' && document.fullscreenElement && document.exitFullscreen) {
    try {
      await document.exitFullscreen();
    } catch {
      // Browser chrome may have already ended fullscreen independently.
    }
  }
}
