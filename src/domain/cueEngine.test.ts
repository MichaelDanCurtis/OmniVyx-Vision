import { describe, expect, it } from 'vitest';
import { findCommandMatch, findCueMatch, normalizePhrase } from './cueEngine';
import { omniVyxShow } from './showGraph';

describe('cueEngine', () => {
  it('normalizes casing, punctuation, and repeated whitespace', () => {
    expect(normalizePhrase('  Hey, Codex: SHOW   the bottom line! ')).toBe(
      'hey codex show the bottom line',
    );
  });

  it('matches explicit presenter commands', () => {
    const match = findCommandMatch('Hey Codex, hold here', omniVyxShow.commands);

    expect(match).toEqual({
      type: 'hold',
      phrase: 'hey codex hold here',
      label: 'Hold here',
    });
  });

  it('matches natural content cue phrases to a target moment', () => {
    const match = findCueMatch(
      'This is a living visual stage, not a normal slide deck.',
      omniVyxShow.moments,
    );

    expect(match?.momentId).toBe('what-it-is');
    expect(match?.phrase).toBe('living visual stage');
  });

  it('returns null when no command or cue matches', () => {
    expect(findCommandMatch('I need coffee after this', omniVyxShow.commands)).toBeNull();
    expect(findCueMatch('I need coffee after this', omniVyxShow.moments)).toBeNull();
  });
});

