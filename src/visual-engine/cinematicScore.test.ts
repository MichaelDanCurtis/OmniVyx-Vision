import { describe, expect, it } from 'vitest';
import {
  dampingForDuration,
  getCinematicCue,
  omniVyxCinematicShow,
} from './cinematicScore';
import { stageEvents } from './stageScore';

describe('cinematicScore', () => {
  it('versions the show document and scores every stage event exactly once', () => {
    expect(omniVyxCinematicShow.schemaVersion).toBe(9);
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
        ...cue.camera.shot.positionArc,
        ...cue.camera.shot.targetArc,
        cue.camera.shot.roll,
        cue.camera.shot.fovArc,
        ...cue.camera.portrait.targetOffset,
        cue.camera.portrait.pullback,
        cue.transition.durationMs,
        cue.transition.damping,
        cue.transition.copyDelayMs,
        ...cue.transition.copyOffset,
        cue.transition.sweepAngle,
        cue.transition.sweepIntensity,
        ...Object.values(cue.transition.pacing),
        ...Object.values(cue.transition.staging).flat(),
        cue.media.opacity,
        cue.media.scale,
        ...cue.media.offset,
        cue.media.depth,
        cue.media.drift,
        cue.media.tintStrength,
        ...Object.values(cue.composition),
        ...cue.evidence.position,
        ...cue.evidence.rotation,
        cue.evidence.spread,
        ...Object.values(cue.lighting),
        cue.environment.glow,
        ...cue.environment.glowPosition,
        cue.environment.horizon,
        cue.environment.ribbons,
        cue.environment.grid,
        cue.environment.particles,
        cue.environment.particleSize,
        cue.environment.drift,
        ...Object.values(cue.lens),
        cue.motionEnergy,
      ];

      expect(values.every(Number.isFinite)).toBe(true);
      expect(cue.transition.durationMs).toBeGreaterThan(0);
      expect(cue.camera.fov).toBeGreaterThanOrEqual(30);
      expect(cue.camera.fov).toBeLessThanOrEqual(55);
      expect(cue.camera.fov + cue.camera.shot.fovArc).toBeGreaterThanOrEqual(30);
      expect(cue.camera.fov + cue.camera.shot.fovArc).toBeLessThanOrEqual(55);
      expect(Math.abs(cue.camera.shot.roll)).toBeLessThanOrEqual(0.04);
      expect(cue.camera.portrait.pullback).toBeGreaterThanOrEqual(0);
      expect(cue.camera.portrait.pullback).toBeLessThanOrEqual(2);
      expect(cue.copy.headline.length).toBeGreaterThan(0);
      expect(cue.copy.headlineLines.join(' ')).toBe(cue.copy.headline);
      expect(cue.copy.headlineLines.length).toBeGreaterThanOrEqual(2);
      expect(cue.transition.copyDelayMs).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeLessThanOrEqual(1.2);
      expect(cue.transition.pacing.minimumRate).toBeGreaterThan(0);
      expect(cue.transition.pacing.maximumRate).toBeGreaterThanOrEqual(
        cue.transition.pacing.minimumRate,
      );
      expect(cue.transition.pacing.idleRate).toBeGreaterThanOrEqual(
        cue.transition.pacing.minimumRate,
      );
      expect(cue.transition.pacing.idleRate).toBeLessThanOrEqual(
        cue.transition.pacing.maximumRate,
      );
      Object.values(cue.transition.staging).forEach(([start, end]) => {
        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(1);
        expect(start).toBeLessThan(end);
      });
      expect(cue.transition.staging.camera[0]).toBe(0);
      expect(cue.transition.staging.copy[0]).toBeGreaterThan(
        cue.transition.staging.camera[0],
      );
      expect(cue.media.asset).toMatch(/^\/engine\/.+\.(?:jpe?g|png|webp)$/i);
      expect(cue.media.opacity).toBeGreaterThanOrEqual(0);
      expect(cue.media.opacity).toBeLessThanOrEqual(1);
      expect(cue.media.scale).toBeGreaterThan(0);
      expect(cue.evidence.spread).toBeGreaterThan(0);
      expect(cue.environment.glow).toBeGreaterThanOrEqual(0);
      expect(cue.environment.glow).toBeLessThanOrEqual(1);
      expect(cue.environment.glowPosition.every((value) => value >= -1 && value <= 1)).toBe(true);
      expect(cue.environment.horizon).toBeGreaterThanOrEqual(0);
      expect(cue.environment.horizon).toBeLessThanOrEqual(1);
      expect(cue.environment.ribbons).toBeGreaterThanOrEqual(0);
      expect(cue.environment.ribbons).toBeLessThanOrEqual(1);
      expect(cue.environment.grid).toBeGreaterThanOrEqual(0);
      expect(cue.environment.grid).toBeLessThanOrEqual(1);
      expect(cue.environment.particles).toBeGreaterThanOrEqual(0);
      expect(cue.environment.particles).toBeLessThanOrEqual(1);
      expect(cue.environment.particleSize).toBeGreaterThan(0);
      expect(cue.environment.particleSize).toBeLessThanOrEqual(0.05);
      expect(cue.environment.drift).toBeGreaterThanOrEqual(0);
      expect(cue.environment.drift).toBeLessThanOrEqual(1);
      expect(cue.lens.bloom).toBeGreaterThanOrEqual(0);
      expect(cue.lens.focusDistance).toBeGreaterThan(0);
      expect(cue.lens.focusRange).toBeGreaterThan(0);
      expect(cue.lens.bokehScale).toBeGreaterThanOrEqual(0);
      expect(cue.lens.vignetteDarkness).toBeGreaterThanOrEqual(0);
      expect(cue.lens.vignetteDarkness).toBeLessThanOrEqual(1);
      expect(cue.lens.vignetteOffset).toBeGreaterThanOrEqual(0);
      expect(cue.lens.vignetteOffset).toBeLessThanOrEqual(1);
      expect(cue.lens.exposure).toBeGreaterThan(0);
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
    expect(getCinematicCue('reveal_product').media.opacity)
      .toBeGreaterThan(getCinematicCue('hold').media.opacity);
  });

  it('keeps evidence crisp and gives the product reveal a tighter optical lens', () => {
    const reveal = getCinematicCue('reveal_product').lens;
    const chart = getCinematicCue('summon_dynamic_chart').lens;

    expect(chart.focusRange).toBeGreaterThan(reveal.focusRange);
    expect(chart.bokehScale).toBeLessThan(reveal.bokehScale);
    expect(chart.bloom).toBeLessThan(reveal.bloom);
  });

  it('scores distinct single-pass media treatments from the shared optical master', () => {
    const reveal = getCinematicCue('reveal_product');
    const direction = getCinematicCue('explain_value');
    const growth = getCinematicCue('grow_system');
    const chart = getCinematicCue('summon_dynamic_chart');
    const hold = getCinematicCue('hold');

    expect(growth.environment.ribbons).toBeGreaterThan(reveal.environment.ribbons);
    expect(growth.media.tintStrength).toBeGreaterThan(direction.media.tintStrength);
    expect(chart.environment.grid).toBeGreaterThan(0.5);
    expect(chart.lens.bokehScale).toBeLessThan(reveal.lens.bokehScale);
    expect(hold.media.opacity).toBeLessThan(reveal.media.opacity);
  });

  it('authors distinct organic, evidence, quiet, and product worlds', () => {
    const reveal = getCinematicCue('reveal_product').environment;
    const growth = getCinematicCue('grow_system').environment;
    const chart = getCinematicCue('summon_dynamic_chart').environment;
    const hold = getCinematicCue('hold').environment;

    expect(growth.ribbons).toBeGreaterThan(chart.ribbons);
    expect(chart.grid).toBeGreaterThan(growth.grid);
    expect(hold.glow).toBeLessThan(reveal.glow);
    expect(hold.drift).toBeLessThan(reveal.drift);
  });

  it('gives live direction and hold distinct optical-core compositions', () => {
    const direction = getCinematicCue('explain_value').composition;
    const hold = getCinematicCue('hold').composition;

    expect(direction.heroYaw).toBeGreaterThan(0.3);
    expect(direction.heroX).toBeGreaterThan(1.3);
    expect(hold.coreScale).toBeGreaterThan(0.6);
    expect(hold.growthScale).toBeLessThan(0.1);
    expect(hold.glassSpread).toBeLessThan(direction.glassSpread);
  });

  it('authors distinct camera paths for reveal, growth, evidence, and hold', () => {
    const reveal = getCinematicCue('reveal_product').camera.shot;
    const growth = getCinematicCue('grow_system').camera.shot;
    const chart = getCinematicCue('summon_dynamic_chart').camera.shot;
    const hold = getCinematicCue('hold').camera.shot;

    expect(reveal.positionArc[2]).toBeLessThan(-0.7);
    expect(growth.positionArc[0]).toBeGreaterThan(0.5);
    expect(chart.targetArc[0]).toBeGreaterThan(0.3);
    expect(hold.positionArc[2]).toBeGreaterThan(0.4);
    expect(getCinematicCue('reveal_product').camera.portrait.targetOffset[0])
      .toBeGreaterThan(0.8);
  });
});
