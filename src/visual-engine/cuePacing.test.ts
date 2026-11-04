import { describe, expect, it } from 'vitest';
import { getCinematicCue } from './cinematicScore';
import { resolveCuePace, scaleCueDuration } from './cuePacing';

describe('cuePacing', () => {
  it('keeps quiet cues on their authored idle rate', () => {
    const hold = getCinematicCue('hold').transition.pacing;

    expect(resolveCuePace(hold)).toBe(hold.idleRate);
  });

  it('accelerates energetic cues without leaving the authored range', () => {
    const reveal = getCinematicCue('reveal_product').transition.pacing;
    const energetic = resolveCuePace(reveal, 0.72, 0.58);

    expect(energetic).toBeGreaterThan(reveal.idleRate);
    expect(energetic).toBeLessThanOrEqual(reveal.maximumRate);
  });

  it('keeps an evidence summon faster than a hold for the same presenter energy', () => {
    const chart = getCinematicCue('summon_dynamic_chart').transition.pacing;
    const hold = getCinematicCue('hold').transition.pacing;

    expect(resolveCuePace(chart, 0.5, 0.4)).toBeGreaterThan(
      resolveCuePace(hold, 0.5, 0.4),
    );
  });

  it('scales every authored duration with the same pace', () => {
    expect(scaleCueDuration(1_200, 1.2)).toBe(1_000);
    expect(() => scaleCueDuration(1_000, 0)).toThrow(/positive finite/);
    expect(() => resolveCuePace({
      idleRate: 1,
      minimumRate: 1.1,
      maximumRate: 0.9,
      energyGain: 0,
      peakGain: 0,
    })).toThrow(/positive and increasing/);
  });
});
