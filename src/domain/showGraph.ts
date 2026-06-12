export type MomentTone = 'reveal' | 'build' | 'perform' | 'proof' | 'ocean' | 'close';

export interface ShowMoment {
  id: string;
  order: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  speakerLine: string;
  cuePhrases: string[];
  visualKeywords: string[];
  tone: MomentTone;
  durationSec: number;
}

export type CommandType = 'next' | 'previous' | 'hold' | 'restart' | 'jump';

export interface ShowCommand {
  type: CommandType;
  label: string;
  phrases: string[];
  targetMomentId?: string;
}

export interface ShowGraph {
  id: string;
  title: string;
  subtitle: string;
  moments: ShowMoment[];
  commands: ShowCommand[];
}

export const omniVyxShow: ShowGraph = {
  id: 'omnivyx-self-demo',
  title: 'OmniVyx',
  subtitle: 'Presentations that listen, move, and co-perform with you.',
  moments: [
    {
      id: 'cold-open',
      order: 0,
      eyebrow: 'Cold open',
      title: 'Imagine your presentation could listen.',
      subtitle: 'The deck is no longer a file. It is an active visual partner.',
      speakerLine: 'Imagine your presentation could listen and move with you.',
      cuePhrases: ['presentation could listen', 'imagine your presentation'],
      visualKeywords: ['listen', 'move', 'partner'],
      tone: 'reveal',
      durationSec: 8,
    },
    {
      id: 'what-it-is',
      order: 1,
      eyebrow: 'What it is',
      title: 'A living visual stage.',
      subtitle: 'PowerPoint usability, video behavior, and AI-driven timing.',
      speakerLine: 'It is not a deck. It is a living visual stage.',
      cuePhrases: ['living visual stage', 'not a deck', 'what it is'],
      visualKeywords: ['stage', 'motion', 'voice'],
      tone: 'reveal',
      durationSec: 10,
    },
    {
      id: 'how-it-builds',
      order: 2,
      eyebrow: 'How it builds',
      title: 'Prompt to motion moments.',
      subtitle: 'Codex turns a rough idea into keyframes, cues, diagrams, and scene logic.',
      speakerLine: 'We author motion moments together from a simple brief.',
      cuePhrases: ['motion moments', 'how it builds', 'simple brief'],
      visualKeywords: ['prompt', 'keyframes', 'cues'],
      tone: 'build',
      durationSec: 11,
    },
    {
      id: 'how-it-performs',
      order: 3,
      eyebrow: 'How it performs',
      title: 'Voice drives the canvas.',
      subtitle: 'Natural cue phrases and explicit commands guide the active background.',
      speakerLine: 'During the meeting, voice drives the canvas.',
      cuePhrases: ['voice drives the canvas', 'during the meeting', 'active background'],
      visualKeywords: ['voice', 'canvas', 'commands'],
      tone: 'perform',
      durationSec: 11,
    },
    {
      id: 'why-it-matters',
      order: 4,
      eyebrow: 'Why it matters',
      title: 'Slides become co-performance.',
      subtitle: 'The human keeps judgment and presence. The AI keeps the show on cue.',
      speakerLine: 'The presenter and the AI are now on cue together.',
      cuePhrases: ['co performance', 'on cue together', 'why it matters'],
      visualKeywords: ['presence', 'timing', 'cue'],
      tone: 'proof',
      durationSec: 10,
    },
    {
      id: 'ocean-fog',
      order: 5,
      eyebrow: 'Scene direction',
      title: 'Fog rolls in behind me.',
      subtitle: 'Natural language becomes layered stage design: horizon, silk fog, presenter, typography.',
      speakerLine: 'I am standing near the ocean and fog rolls in behind me.',
      cuePhrases: ['fog rolls in behind me', 'standing near the ocean', 'ocean and fog'],
      visualKeywords: ['ocean', 'fog', 'behind me'],
      tone: 'ocean',
      durationSec: 12,
    },
    {
      id: 'close',
      order: 6,
      eyebrow: 'Close',
      title: 'Let’s build one right now.',
      subtitle: 'Author it, rehearse it, perform it, improve it.',
      speakerLine: 'Let us build one right now.',
      cuePhrases: ['build one right now', 'jump to close', 'let us build one'],
      visualKeywords: ['author', 'rehearse', 'perform', 'improve'],
      tone: 'close',
      durationSec: 8,
    },
  ],
  commands: [
    {
      type: 'next',
      label: 'Next moment',
      phrases: ['hey codex next', 'hey codex show me the next slide', 'next slide', 'next moment'],
    },
    {
      type: 'previous',
      label: 'Previous moment',
      phrases: ['hey codex back', 'previous slide', 'previous moment', 'go back'],
    },
    {
      type: 'hold',
      label: 'Hold here',
      phrases: ['hey codex hold here', 'hold here', 'pause here', 'stay here'],
    },
    {
      type: 'restart',
      label: 'Restart show',
      phrases: ['hey codex restart', 'restart show', 'start over'],
    },
    {
      type: 'jump',
      label: 'Show ocean fog',
      phrases: ['show ocean fog', 'make the fog roll in', 'take me to the ocean'],
      targetMomentId: 'ocean-fog',
    },
    {
      type: 'jump',
      label: 'Jump to close',
      phrases: ['hey codex jump to close', 'jump to close', 'take us home'],
      targetMomentId: 'close',
    },
    {
      type: 'jump',
      label: 'Show how it builds',
      phrases: ['show how it builds', 'go to build mode', 'show the build'],
      targetMomentId: 'how-it-builds',
    },
    {
      type: 'jump',
      label: 'Show performance',
      phrases: ['show performance', 'show how it performs', 'go to perform mode'],
      targetMomentId: 'how-it-performs',
    },
  ],
};

export function getMoment(show: ShowGraph, momentId: string): ShowMoment {
  const moment = show.moments.find((item) => item.id === momentId);
  if (!moment) {
    throw new Error(`Unknown moment "${momentId}"`);
  }
  return moment;
}
