import { describe, expect, it } from 'vitest';
import {
  dampingForDuration,
  getCinematicCue,
  omniVyxCinematicShow,
} from './cinematicScore';
import { stageEvents } from './stageScore';

describe('cinematicScore', () => {
  it('versions the show document and scores every stage event exactly once', () => {
    expect(omniVyxCinematicShow.schemaVersion).toBe(1);
    expect(omniVyxCinematicShow.cueOrder).toEqual(stageEvents.map((event) => event.id));
    expect(Object.keys(omniVyxCinematicShow.cues).sort()).toEqual(
      stageEvents.map((event) => event.id).sort(),
    );
  });

  it('keeps every cinematic target finite and renderable', () => {
    for (const event of stageEvents) {
      const cue = getCinematicCue(event.id);
      const values = [
        ...cue.camera.position,
        ...cue.camera.target,
        cue.camera.fov,
        cue.transition.durationMs,
        cue.transition.damping,
        ...Object.values(cue.composition),
        ...Object.values(cue.lighting),
        cue.motionEnergy,
      ];

      expect(values.every(Number.isFinite)).toBe(true);
      expect(cue.transition.durationMs).toBeGreaterThan(0);
      expect(cue.camera.fov).toBeGreaterThanOrEqual(30);
      expect(cue.camera.fov).toBeLessThanOrEqual(55);
      expect(cue.copy.headline.length).toBeGreaterThan(0);
    }
  });

  it('converts duration into frame-rate-independent exponential damping', () => {
    expect(dampingForDuration(1_000)).toBeCloseTo(Math.log(20), 6);
    expect(dampingForDuration(2_000)).toBeCloseTo(Math.log(20) / 2, 6);
    expect(() => dampingForDuration(0)).toThrow(/positive finite/);
  });
});
