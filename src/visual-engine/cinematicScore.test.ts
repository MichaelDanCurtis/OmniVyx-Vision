import { describe, expect, it } from 'vitest';
import {
  dampingForDuration,
  getCinematicCue,
  omniVyxCinematicShow,
} from './cinematicScore';
import { stageEvents } from './stageScore';

describe('cinematicScore', () => {
  it('versions the show document and scores every stage event exactly once', () => {
    expect(omniVyxCinematicShow.schemaVersion).toBe(2);
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
        cue.transition.copyDelayMs,
        ...cue.transition.copyOffset,
        cue.transition.sweepAngle,
        cue.transition.sweepIntensity,
        ...Object.values(cue.composition),
        ...Object.values(cue.lighting),
        cue.motionEnergy,
      ];

      expect(values.every(Number.isFinite)).toBe(true);
      expect(cue.transition.durationMs).toBeGreaterThan(0);
      expect(cue.camera.fov).toBeGreaterThanOrEqual(30);
      expect(cue.camera.fov).toBeLessThanOrEqual(55);
      expect(cue.copy.headline.length).toBeGreaterThan(0);
      expect(cue.copy.headlineLines.join(' ')).toBe(cue.copy.headline);
      expect(cue.copy.headlineLines.length).toBeGreaterThanOrEqual(2);
      expect(cue.transition.copyDelayMs).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeLessThanOrEqual(1.2);
      expect(Object.values(cue.palette).every((color) => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
    }
  });

  it('converts duration into frame-rate-independent exponential damping', () => {
    expect(dampingForDuration(1_000)).toBeCloseTo(Math.log(20), 6);
    expect(dampingForDuration(2_000)).toBeCloseTo(Math.log(20) / 2, 6);
    expect(() => dampingForDuration(0)).toThrow(/positive finite/);
  });

  it('gives each major cue one dominant visual actor', () => {
    const reveal = getCinematicCue('reveal_product').composition;
    const growth = getCinematicCue('grow_system').composition;
    const chart = getCinematicCue('summon_dynamic_chart').composition;

    expect(reveal.coreScale).toBeGreaterThan(1);
    expect(growth.growthScale).toBe(1);
    expect(growth.coreScale).toBeLessThan(0.1);
    expect(chart.chartScale).toBe(1);
    expect(chart.coreScale).toBeLessThan(0.1);
    expect(chart.growthScale).toBeLessThan(0.1);
  });
});
