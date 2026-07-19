import { describe, expect, it } from 'vitest';
import {
  buildKineticHeadline,
  resolveKineticSpeechStyle,
  writeKineticSpeechStyle,
} from './kineticCopy';

describe('buildKineticHeadline', () => {
  it('preserves authored lines while assigning a continuous word sequence', () => {
    const lines = buildKineticHeadline(['The stage is', 'listening.']);

    expect(lines.map((line) => line.words.map((word) => word.text).join(' '))).toEqual([
      'The stage is',
      'listening.',
    ]);
    expect(lines.flatMap((line) => line.words.map((word) => word.globalIndex))).toEqual([
      0,
      1,
      2,
      3,
    ]);
  });

  it('normalizes incidental whitespace without creating empty animated words', () => {
    const [line] = buildKineticHeadline(['  Intent   becomes motion.  ']);

    expect(line.words.map((word) => word.text)).toEqual(['Intent', 'becomes', 'motion.']);
    expect(line.words.map((word) => word.index)).toEqual([0, 1, 2]);
  });
});

describe('resolveKineticSpeechStyle', () => {
  it('keeps an idle presenter optically quiet', () => {
    expect(resolveKineticSpeechStyle(0, 0)).toEqual({
      brightness: '1.000',
      glint: '0.080',
      glintPosition: '34%',
      lift: '0.0000em',
      scale: '1.0000',
    });
  });

  it('bounds the maximum live response while reusing the render-loop sample', () => {
    const sample = resolveKineticSpeechStyle(0, 0);

    expect(writeKineticSpeechStyle(2, 4, sample)).toBe(sample);
    expect(sample).toEqual({
      brightness: '1.180',
      glint: '0.580',
      glintPosition: '66%',
      lift: '-0.0180em',
      scale: '1.0060',
    });
  });
});
