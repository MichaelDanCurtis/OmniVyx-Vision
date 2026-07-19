import { describe, expect, it } from 'vitest';
import { findStageIntent, findStageIntentPreview } from './stageIntent';

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

  it('preflights a likely product cue before the phrase is final', () => {
    const preview = findStageIntentPreview(
      'Today I want to introduce you to Omni',
      'open_brand',
    );

    expect(preview?.eventId).toBe('reveal_product');
    expect(preview?.complete).toBe(false);
    expect(preview?.confidence).toBeGreaterThan(0.7);
    expect(preview?.confidence).toBeLessThan(1);
  });

  it('preflights partial relative and evidence commands without committing noise', () => {
    expect(findStageIntentPreview('Could we go to the next sl', 'reveal_product')?.eventId)
      .toBe('explain_value');
    expect(findStageIntentPreview('Show us the year over year pro', 'grow_system')?.eventId)
      .toBe('summon_dynamic_chart');
    expect(findStageIntentPreview('This thought is still forming', 'open_brand')).toBeNull();
  });

  it('marks a complete phrase as a full-confidence preview', () => {
    expect(findStageIntentPreview('Please show the chart', 'grow_system')).toMatchObject({
      complete: true,
      confidence: 1,
      eventId: 'summon_dynamic_chart',
    });
  });
});
