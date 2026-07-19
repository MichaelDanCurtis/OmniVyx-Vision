export type StageEventId =
  | 'open_brand'
  | 'reveal_product'
  | 'explain_value'
  | 'grow_system'
  | 'summon_dynamic_chart'
  | 'hold'
  | 'resolve';

export type StageQuality = 'high' | 'low';

export interface StageEventMeta {
  id: StageEventId;
  label: string;
  description: string;
  mediaRate: number;
}

export interface StageState {
  activeEvent: StageEventId;
  previousEvent: StageEventId | null;
  dynamicChartVisible: boolean;
  mediaPlaybackRate: number;
  quality: StageQuality;
  effectsEnabled: boolean;
}

export const stageEvents: StageEventMeta[] = [
  {
    id: 'open_brand',
    label: 'Open brand',
    description: 'Establish the stage, ambient motion, and dark cinematic space.',
    mediaRate: 0.7,
  },
  {
    id: 'reveal_product',
    label: 'Reveal product',
    description: 'Bring product identity forward and push previous brand context aside.',
    mediaRate: 1.1,
  },
  {
    id: 'explain_value',
    label: 'Explain value',
    description: 'Organize video and glass layers into a clearer composition.',
    mediaRate: 0.9,
  },
  {
    id: 'grow_system',
    label: 'Grow system',
    description: 'Reveal the organic branching system behind the product story.',
    mediaRate: 0.6,
  },
  {
    id: 'summon_dynamic_chart',
    label: 'Summon dynamic chart',
    description: 'Bring in a preloaded proof panel without breaking the cinematic stage.',
    mediaRate: 0.45,
  },
  {
    id: 'hold',
    label: 'Hold',
    description: 'Keep the stage alive while the presenter lingers on a point.',
    mediaRate: 0.25,
  },
  {
    id: 'resolve',
    label: 'Resolve',
    description: 'Land on a polished final tableau.',
    mediaRate: 0.8,
  },
];

const metaById = new Map(stageEvents.map((event) => [event.id, event]));

export function createInitialStageState(): StageState {
  return {
    activeEvent: 'open_brand',
    previousEvent: null,
    dynamicChartVisible: false,
    mediaPlaybackRate: getStageEventMeta('open_brand').mediaRate,
    quality: 'high',
    effectsEnabled: true,
  };
}

export function applyStageEvent(state: StageState, eventId: StageEventId): StageState {
  const meta = getStageEventMeta(eventId);
  const shouldShowDynamicChart = eventId === 'summon_dynamic_chart'
    ? true
    : eventId === 'resolve'
      ? state.dynamicChartVisible
      : false;

  return {
    ...state,
    activeEvent: eventId,
    previousEvent: eventId === 'hold' ? state.activeEvent : state.previousEvent,
    dynamicChartVisible: shouldShowDynamicChart,
    mediaPlaybackRate: meta.mediaRate,
  };
}

export function setStageQuality(state: StageState, quality: StageQuality): StageState {
  return {
    ...state,
    quality,
    effectsEnabled: quality === 'high',
  };
}

export function getStageEventMeta(eventId: StageEventId): StageEventMeta {
  const meta = metaById.get(eventId);
  if (!meta) {
    throw new Error(`Unknown stage event: ${eventId}`);
  }
  return meta;
}
