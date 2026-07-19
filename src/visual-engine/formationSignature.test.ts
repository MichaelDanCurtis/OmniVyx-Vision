import { describe, expect, it } from 'vitest';
import {
  formationSignatureIndex,
  formationSignatures,
  getStageFormation,
} from './formationSignature';

describe('formationSignature', () => {
  it('maps every authored formation to a stable shader index', () => {
    expect(formationSignatures.map(formationSignatureIndex)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('keeps every formation profile finite and within stage-safe bounds', () => {
    formationSignatures.forEach((signature) => {
      const profile = getStageFormation(signature);
      const values = [
        ...Object.values(profile.glass),
        ...profile.hero.aspect,
        profile.hero.finSpread,
        profile.hero.finTwist,
        ...profile.hero.tilt,
        ...profile.network.aspect,
        ...profile.network.offset,
        profile.network.rotation,
        ...profile.silk.lift,
        ...profile.silk.opacity,
        ...profile.silk.roll,
        ...profile.silk.span,
        ...profile.silk.yaw,
      ];

      expect(values.every(Number.isFinite)).toBe(true);
      expect(profile.glass.convergence).toBeGreaterThanOrEqual(0);
      expect(profile.glass.convergence).toBeLessThanOrEqual(0.7);
      expect(profile.glass.corridor).toBeGreaterThanOrEqual(0);
      expect(profile.glass.corridor).toBeLessThanOrEqual(1);
      expect(profile.glass.opacity).toBeGreaterThanOrEqual(0.2);
      expect(profile.glass.opacity).toBeLessThanOrEqual(1);
      expect(profile.glass.scale).toBeGreaterThanOrEqual(0.5);
      expect(profile.glass.scale).toBeLessThanOrEqual(1.2);
      expect(profile.hero.aspect.every((value) => value >= 0.8 && value <= 1.2)).toBe(true);
      expect(profile.network.aspect.every((value) => value >= 0.8 && value <= 1.2)).toBe(true);
      expect(profile.silk.opacity.every((value) => value >= 0.2 && value <= 1)).toBe(true);
      expect(profile.silk.span.every((value) => value >= 0.8 && value <= 1.25)).toBe(true);
    });
  });

  it('separates hero, glass, silk, and network silhouettes across the show', () => {
    const profiles = formationSignatures.map(getStageFormation);

    expect(new Set(profiles.map((profile) => profile.glass.corridor)).size).toBe(7);
    expect(new Set(profiles.map((profile) => profile.hero.finTwist)).size).toBeGreaterThan(5);
    expect(new Set(profiles.map((profile) => profile.silk.span.join(','))).size).toBe(7);
    expect(new Set(profiles.map((profile) => profile.network.offset.join(','))).size).toBe(7);
  });
});
