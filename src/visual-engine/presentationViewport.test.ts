import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  enterPresentationViewport,
  exitPresentationViewport,
  PRESENTATION_CHROME_IDLE_MS,
  selectPresentationViewportMode,
} from './presentationViewport';

describe('presentationViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefers native fullscreen, then browser fullscreen, then the CSS surface', () => {
    expect(selectPresentationViewportMode(true, true)).toBe('native');
    expect(selectPresentationViewportMode(false, true)).toBe('browser');
    expect(selectPresentationViewportMode(false, false)).toBe('css');
  });

  it('uses a short but operable idle interval for pointer chrome', () => {
    expect(PRESENTATION_CHROME_IDLE_MS).toBeGreaterThanOrEqual(1_000);
    expect(PRESENTATION_CHROME_IDLE_MS).toBeLessThanOrEqual(2_000);
  });

  it('uses browser fullscreen when the request succeeds', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', {
      documentElement: { requestFullscreen },
      fullscreenElement: {},
      fullscreenEnabled: true,
    });

    await expect(enterPresentationViewport()).resolves.toBe('browser');
    expect(requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
  });

  it('retains the CSS surface when browser fullscreen is disabled or rejected', async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error('denied'));
    vi.stubGlobal('document', {
      documentElement: { requestFullscreen },
      fullscreenElement: null,
      fullscreenEnabled: false,
    });

    await expect(enterPresentationViewport()).resolves.toBe('css');
    expect(requestFullscreen).not.toHaveBeenCalled();

    vi.stubGlobal('document', {
      documentElement: { requestFullscreen },
      fullscreenElement: null,
      fullscreenEnabled: true,
    });

    await expect(enterPresentationViewport()).resolves.toBe('css');
  });

  it('ends browser fullscreen only when the document still owns it', async () => {
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('document', {
      exitFullscreen,
      fullscreenElement: {},
    });

    await exitPresentationViewport('browser');
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });
});
