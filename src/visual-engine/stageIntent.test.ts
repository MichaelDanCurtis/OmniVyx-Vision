import { describe, expect, it } from 'vitest';
import { findStageIntent } from './stageIntent';

describe('stageIntent', () => {
  it('maps product announcement language to the reveal event', () => {
    const match = findStageIntent(
      'Today I want to introduce you to Omnilux, our new product.',
      'open_brand',
    );

    expect(match).toEqual({
      eventId: 'reveal_product',
      label: 'Reveal product',
      phrase: 'introduce you to omnilux',
      source: 'stage_phrase',
    });
  });

  it('maps dynamic proof language to the chart summon event', () => {
    const match = findStageIntent(
      'Hey Omni, can you show us the year over year projections?',
      'grow_system',
    );

    expect(match?.eventId).toBe('summon_dynamic_chart');
    expect(match?.phrase).toBe('year over year projections');
  });

  it('advances relative to the active event for natural next-slide commands', () => {
    const match = findStageIntent('Can you show me the next slide?', 'reveal_product');

    expect(match).toEqual({
      eventId: 'explain_value',
      label: 'Explain value',
      phrase: 'next slide',
      source: 'next_command',
    });
  });

  it('holds the active stage when the presenter asks for a moment', () => {
    const match = findStageIntent('Let me take a moment here.', 'summon_dynamic_chart');

    expect(match).toEqual({
      eventId: 'hold',
      label: 'Hold',
      phrase: 'take a moment',
      source: 'hold_command',
    });
  });

  it('advances from the previous event when the current stage is holding', () => {
    const match = findStageIntent('Okay, next slide.', 'hold', 'grow_system');

    expect(match?.eventId).toBe('summon_dynamic_chart');
    expect(match?.source).toBe('next_command');
  });

  it('returns null when the transcript has no stage intent', () => {
    expect(findStageIntent('I need to check something unrelated.', 'open_brand')).toBeNull();
  });
});
