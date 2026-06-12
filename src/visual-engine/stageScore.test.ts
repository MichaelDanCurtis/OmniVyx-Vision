import { describe, expect, it } from 'vitest';
import {
  applyStageEvent,
  createInitialStageState,
  getStageEventMeta,
  setStageQuality,
  stageEvents,
} from './stageScore';

describe('stageScore', () => {
  it('starts on the open brand event with the dynamic chart hidden', () => {
    const state = createInitialStageState();

    expect(state.activeEvent).toBe('open_brand');
    expect(state.dynamicChartVisible).toBe(false);
    expect(state.videoPlaybackRate).toBe(0.7);
    expect(stageEvents.map((event) => event.id)).toEqual([
      'open_brand',
      'reveal_product',
      'explain_value',
      'grow_system',
      'summon_dynamic_chart',
      'hold',
      'resolve',
    ]);
  });

  it('turns the dynamic chart on only after the chart summon event', () => {
    const revealed = applyStageEvent(createInitialStageState(), 'reveal_product');
    const summoned = applyStageEvent(revealed, 'summon_dynamic_chart');

    expect(revealed.dynamicChartVisible).toBe(false);
    expect(summoned.dynamicChartVisible).toBe(true);
    expect(summoned.videoPlaybackRate).toBe(0.45);
  });

  it('keeps the previous event context when holding', () => {
    const grown = applyStageEvent(createInitialStageState(), 'grow_system');
    const held = applyStageEvent(grown, 'hold');

    expect(held.activeEvent).toBe('hold');
    expect(held.previousEvent).toBe('grow_system');
    expect(held.dynamicChartVisible).toBe(false);
    expect(held.videoPlaybackRate).toBe(0.25);
  });

  it('switches quality levels with deterministic feature flags', () => {
    const low = setStageQuality(createInitialStageState(), 'low');
    const high = setStageQuality(low, 'high');

    expect(low.quality).toBe('low');
    expect(low.effectsEnabled).toBe(false);
    expect(high.quality).toBe('high');
    expect(high.effectsEnabled).toBe(true);
  });

  it('provides display metadata for stage controls', () => {
    expect(getStageEventMeta('resolve').label).toBe('Resolve');
  });
});
