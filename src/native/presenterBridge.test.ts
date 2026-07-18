import { describe, expect, it } from 'vitest';
import { getBrowserPresenterCapabilities } from './presenterBridge';

describe('presenterBridge', () => {
  it('describes the browser as a fallback without pretending native services exist', () => {
    const capabilities = getBrowserPresenterCapabilities();

    expect(capabilities.nativeShell).toBe(false);
    expect(capabilities.kernelVersion).toBe('web-fallback/0.1');
    expect(capabilities.subsystems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'visual-stage', status: 'ready' }),
        expect.objectContaining({ id: 'speech-recognition', status: 'unavailable' }),
      ]),
    );
  });
});
