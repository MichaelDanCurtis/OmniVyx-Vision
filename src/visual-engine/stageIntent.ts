import { normalizePhrase } from '../domain/cueEngine';
import { getStageEventMeta, type StageEventId } from './stageScore';

export type StageIntentSource =
  | 'stage_phrase'
  | 'next_command'
  | 'previous_command'
  | 'hold_command';

export interface StageIntentMatch {
  eventId: StageEventId;
  label: string;
  phrase: string;
  source: StageIntentSource;
}

const stageOrder: StageEventId[] = [
  'open_brand',
  'reveal_product',
  'explain_value',
  'grow_system',
  'summon_dynamic_chart',
  'resolve',
];

const holdPhrases = ['hold here', 'pause here', 'take a moment', 'stay here'];
const nextPhrases = ['next slide', 'next scene', 'move on', 'keep going', 'go next'];
const previousPhrases = ['go back', 'previous slide', 'previous scene', 'back up'];

const stagePhraseMap: Array<{ eventId: StageEventId; phrases: string[] }> = [
  {
    eventId: 'open_brand',
    phrases: ['company name', 'start the show', 'open brand', 'introduce the company'],
  },
  {
    eventId: 'reveal_product',
    phrases: ['introduce you to omnilux', 'new product', 'product announcement', 'reveal product'],
  },
  {
    eventId: 'explain_value',
    phrases: ['simplify your day', 'what omnilux does', 'what it does', 'how it helps'],
  },
  {
    eventId: 'grow_system',
    phrases: ['tree grows', 'system grows', 'living system', 'growth behind'],
  },
  {
    eventId: 'summon_dynamic_chart',
    phrases: ['year over year projections', 'show us the numbers', 'expected sales', 'show the chart'],
  },
  {
    eventId: 'resolve',
    phrases: ['bottom line', 'wrap up', 'bring it home', 'final tableau'],
  },
];

export function findStageIntent(
  transcript: string,
  activeEvent: StageEventId,
  previousEvent: StageEventId | null = null,
): StageIntentMatch | null {
  const normalized = normalizePhrase(transcript);
  if (!normalized) return null;
  const relativeEvent = activeEvent === 'hold' && previousEvent ? previousEvent : activeEvent;

  const holdPhrase = findPhrase(normalized, holdPhrases);
  if (holdPhrase) return createMatch('hold', holdPhrase, 'hold_command');

  const nextPhrase = findPhrase(normalized, nextPhrases);
  if (nextPhrase) return createMatch(getRelativeStageEvent(relativeEvent, 1), nextPhrase, 'next_command');

  const previousPhrase = findPhrase(normalized, previousPhrases);
  if (previousPhrase) {
    return createMatch(getRelativeStageEvent(relativeEvent, -1), previousPhrase, 'previous_command');
  }

  for (const entry of stagePhraseMap) {
    const phrase = findPhrase(normalized, entry.phrases);
    if (phrase) return createMatch(entry.eventId, phrase, 'stage_phrase');
  }

  return null;
}

function findPhrase(normalizedTranscript: string, phrases: string[]): string | null {
  for (const phrase of phrases) {
    const normalizedPhrase = normalizePhrase(phrase);
    if (normalizedTranscript.includes(normalizedPhrase)) return normalizedPhrase;
  }
  return null;
}

function getRelativeStageEvent(activeEvent: StageEventId, offset: -1 | 1): StageEventId {
  const activeIndex = Math.max(0, stageOrder.indexOf(activeEvent));
  const nextIndex = Math.min(stageOrder.length - 1, Math.max(0, activeIndex + offset));
  return stageOrder[nextIndex];
}

function createMatch(
  eventId: StageEventId,
  phrase: string,
  source: StageIntentSource,
): StageIntentMatch {
  return {
    eventId,
    phrase,
    source,
    label: getStageEventMeta(eventId).label,
  };
}
