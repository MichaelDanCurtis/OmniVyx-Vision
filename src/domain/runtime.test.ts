import { describe, expect, it } from 'vitest';
import { createInitialRuntime, runtimeReducer } from './runtime';
import { omniVyxShow } from './showGraph';

describe('runtimeReducer', () => {
  it('moves through moments with next and previous actions', () => {
    const initial = createInitialRuntime(omniVyxShow);
    const next = runtimeReducer(initial, { type: 'next' }, omniVyxShow);
    const back = runtimeReducer(next, { type: 'previous' }, omniVyxShow);

    expect(next.activeMomentId).toBe('what-it-is');
    expect(back.activeMomentId).toBe('cold-open');
  });

  it('toggles hold without changing the active moment', () => {
    const initial = createInitialRuntime(omniVyxShow);
    const held = runtimeReducer(initial, { type: 'toggleHold' }, omniVyxShow);

    expect(held.isHolding).toBe(true);
    expect(held.activeMomentId).toBe('cold-open');
  });

  it('jumps to a moment from a natural cue and records transcript history', () => {
    const initial = createInitialRuntime(omniVyxShow);
    const next = runtimeReducer(
      initial,
      { type: 'heard', transcript: 'Let us talk about motion moments.' },
      omniVyxShow,
    );

    expect(next.activeMomentId).toBe('how-it-builds');
    expect(next.lastCue?.phrase).toBe('motion moments');
    expect(next.transcriptHistory[0]).toContain('motion moments');
  });

  it('jumps to the ocean fog stage direction from a natural scene phrase', () => {
    const initial = createInitialRuntime(omniVyxShow);
    const next = runtimeReducer(
      initial,
      { type: 'heard', transcript: 'I am standing near the ocean and fog rolls in behind me.' },
      omniVyxShow,
    );

    expect(next.activeMomentId).toBe('ocean-fog');
    expect(next.lastCue?.phrase).toBe('fog rolls in behind me');
  });

  it('applies command phrases before natural cue phrases', () => {
    const initial = createInitialRuntime(omniVyxShow);
    const next = runtimeReducer(
      initial,
      { type: 'heard', transcript: 'Hey Codex, jump to close because we can build one right now.' },
      omniVyxShow,
    );

    expect(next.activeMomentId).toBe('close');
    expect(next.lastCommand?.type).toBe('jump');
  });
});
