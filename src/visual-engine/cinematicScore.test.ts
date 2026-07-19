import { describe, expect, it } from 'vitest';
import {
  dampingForDuration,
  getCinematicCue,
  omniVyxCinematicShow,
  transitionSignatureIndex,
} from './cinematicScore';
import { stageEvents } from './stageScore';
import { sceneSignatureIndex, sceneSignatures } from './sceneSignature';
import { normalizeKineticWord, typographySignatures } from './kineticCopy';
import {
  resolveWorldFocusDistance,
  spatialSignatures,
} from './spatialSignature';
import { motionSignatures, sampleCueMotion } from './motionEnvelope';

describe('cinematicScore', () => {
  it('versions the show document and scores every stage event exactly once', () => {
    expect(omniVyxCinematicShow.schemaVersion).toBe(15);
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
        cue.transition.motion.arrivalPower,
        cue.transition.motion.impactAmplitude,
        cue.transition.motion.impactDecay,
        cue.transition.motion.overshootAmplitude,
        cue.transition.motion.overshootDecay,
        cue.transition.motion.overshootSkew,
        ...Object.values(cue.transition.pacing),
        ...Object.values(cue.transition.staging).flat(),
        cue.media.opacity,
        cue.media.scale,
        ...cue.media.offset,
        cue.media.depth,
        cue.media.drift,
        cue.media.tintStrength,
        ...Object.values(cue.composition),
        ...cue.spatial.silkDepth,
        cue.spatial.glassDepthOffset,
        cue.spatial.glassDepthSpread,
        cue.spatial.heroDepth,
        cue.spatial.networkDepth,
        cue.spatial.parallax,
        ...cue.spatial.focusTarget,
        ...cue.evidence.position,
        ...cue.evidence.rotation,
        cue.evidence.spread,
        cue.lighting.ambient,
        cue.lighting.beam,
        ...cue.lighting.focus,
        cue.lighting.focusSize,
        cue.lighting.key,
        cue.lighting.negativeSpace,
        cue.lighting.rim,
        cue.lighting.accent,
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
      const headlineWords = new Set(
        cue.copy.headline.split(/\s+/).map(normalizeKineticWord),
      );
      expect(cue.copy.emphasisWords.length).toBeGreaterThan(0);
      expect(cue.copy.emphasisWords.every(
        (word) => headlineWords.has(normalizeKineticWord(word)),
      )).toBe(true);
      expect(cue.transition.copyDelayMs).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeGreaterThanOrEqual(0);
      expect(cue.transition.sweepIntensity).toBeLessThanOrEqual(1.2);
      expect(cue.transition.motion.arrivalPower).toBeGreaterThan(1);
      expect(cue.transition.motion.arrivalPower).toBeLessThanOrEqual(8);
      expect(cue.transition.motion.impactAmplitude).toBeGreaterThanOrEqual(0);
      expect(cue.transition.motion.impactAmplitude).toBeLessThanOrEqual(1.2);
      expect(cue.transition.motion.impactDecay).toBeGreaterThan(0);
      expect(cue.transition.motion.impactDecay).toBeLessThanOrEqual(12);
      expect(cue.transition.motion.overshootAmplitude).toBeGreaterThanOrEqual(0);
      expect(cue.transition.motion.overshootAmplitude).toBeLessThanOrEqual(1);
      expect(cue.transition.motion.overshootDecay).toBeGreaterThan(0);
      expect(cue.transition.motion.overshootDecay).toBeLessThanOrEqual(8);
      expect(cue.transition.motion.overshootSkew).toBeGreaterThanOrEqual(0.5);
      expect(cue.transition.motion.overshootSkew).toBeLessThanOrEqual(2);
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
      expect(cue.spatial.silkDepth[0]).toBeLessThan(cue.spatial.silkDepth[1]);
      expect(cue.spatial.glassDepthSpread).toBeGreaterThan(0.5);
      expect(cue.spatial.glassDepthSpread).toBeLessThan(2);
      expect(cue.spatial.parallax).toBeGreaterThanOrEqual(0);
      expect(cue.spatial.parallax).toBeLessThanOrEqual(1);
      expect(resolveWorldFocusDistance(
        {
          x: cue.camera.position[0],
          y: cue.camera.position[1],
          z: cue.camera.position[2],
        },
        cue.spatial.focusTarget,
        cue.lens.focusOffset,
      )).toBeGreaterThan(0.1);
      expect(cue.lighting.ambient).toBeGreaterThanOrEqual(0);
      expect(cue.lighting.ambient).toBeLessThanOrEqual(1);
      expect(cue.lighting.beam).toBeGreaterThanOrEqual(0);
      expect(cue.lighting.beam).toBeLessThanOrEqual(1);
      expect(cue.lighting.focus.every((value) => value >= 0 && value <= 1)).toBe(true);
      expect(cue.lighting.focusSize).toBeGreaterThan(0);
      expect(cue.lighting.focusSize).toBeLessThanOrEqual(1);
      expect(cue.lighting.negativeSpace).toBeGreaterThanOrEqual(0);
      expect(cue.lighting.negativeSpace).toBeLessThanOrEqual(1);
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
      expect(cue.lens.focusOffset).toBeGreaterThanOrEqual(-1);
      expect(cue.lens.focusOffset).toBeLessThanOrEqual(1);
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

  it('keeps the product instrument fully framed in portrait presentation', () => {
    const reveal = getCinematicCue('reveal_product');

    expect(reveal.camera.portrait.pullback).toBe(2);
    expect(reveal.camera.portrait.targetOffset[0]).toBeGreaterThan(1);
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

  it('scores focal lighting and protected negative space for every cue', () => {
    const reveal = getCinematicCue('reveal_product').lighting;
    const chart = getCinematicCue('summon_dynamic_chart').lighting;
    const hold = getCinematicCue('hold').lighting;

    expect(reveal.beam).toBeGreaterThan(hold.beam);
    expect(chart.negativeSpace).toBeGreaterThan(reveal.negativeSpace);
    expect(chart.focusSize).toBeLessThan(hold.focusSize);
    expect(hold.ambient).toBeLessThan(reveal.ambient);
  });

  it('authors a distinct semantic transition signature for every show beat', () => {
    const signatures = omniVyxCinematicShow.cueOrder.map(
      (eventId) => getCinematicCue(eventId).transition.signature,
    );
    const indices = signatures.map(transitionSignatureIndex);

    expect(new Set(signatures).size).toBe(signatures.length);
    expect(new Set(indices).size).toBe(indices.length);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('authors a distinct temporal signature for every show beat', () => {
    const signatures = omniVyxCinematicShow.cueOrder.map(
      (eventId) => getCinematicCue(eventId).transition.motion.signature,
    );
    const reveal = sampleCueMotion(
      300,
      1_000,
      undefined,
      getCinematicCue('reveal_product').transition.motion,
    );
    const hold = sampleCueMotion(
      300,
      1_000,
      undefined,
      getCinematicCue('hold').transition.motion,
    );

    expect(signatures).toEqual(motionSignatures);
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(reveal.arrival).toBeGreaterThan(hold.arrival);
    expect(reveal.impact).toBeGreaterThan(hold.impact);
    expect(reveal.overshoot).toBeGreaterThan(hold.overshoot);
  });

  it('authors a distinct settled-scene signature for every show beat', () => {
    const signatures = omniVyxCinematicShow.cueOrder.map(
      (eventId) => getCinematicCue(eventId).environment.signature,
    );
    const indices = signatures.map(sceneSignatureIndex);

    expect(signatures).toEqual(sceneSignatures);
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('authors a distinct typography composition for every show beat', () => {
    const signatures = omniVyxCinematicShow.cueOrder.map(
      (eventId) => getCinematicCue(eventId).copy.signature,
    );

    expect(signatures).toEqual(typographySignatures);
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it('authors a distinct near, mid, and far spatial stack for every show beat', () => {
    const signatures = omniVyxCinematicShow.cueOrder.map(
      (eventId) => getCinematicCue(eventId).spatial.signature,
    );

    expect(signatures).toEqual(spatialSignatures);
    expect(new Set(signatures).size).toBe(signatures.length);
    expect(getCinematicCue('reveal_product').spatial.heroDepth)
      .toBeGreaterThan(getCinematicCue('summon_dynamic_chart').spatial.heroDepth);
    expect(getCinematicCue('explain_value').spatial.parallax)
      .toBeGreaterThan(getCinematicCue('hold').spatial.parallax);
    expect(getCinematicCue('resolve').spatial.silkDepth[1]
      - getCinematicCue('resolve').spatial.silkDepth[0]).toBeGreaterThan(2);
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
