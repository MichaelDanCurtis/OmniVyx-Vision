import type { StageEventId } from './stageScore';

export type Vector3Tuple = readonly [number, number, number];
export type Vector2Tuple = readonly [number, number];

export interface CinematicCue {
  copy: {
    eyebrow: string;
    headline: string;
    headlineLines: readonly string[];
    body: string;
  };
  camera: {
    position: Vector3Tuple;
    target: Vector3Tuple;
    fov: number;
  };
  transition: {
    durationMs: number;
    damping: number;
    copyDelayMs: number;
    copyOffset: Vector2Tuple;
    sweepAngle: number;
    sweepIntensity: number;
  };
  media: {
    asset: string;
    opacity: number;
    scale: number;
    offset: Vector2Tuple;
    depth: number;
    drift: number;
    tintStrength: number;
  };
  composition: {
    coreScale: number;
    growthScale: number;
    chartScale: number;
    ribbonLift: number;
    glassSpread: number;
    heroX: number;
    heroY: number;
    heroYaw: number;
  };
  lighting: {
    key: number;
    rim: number;
    accent: number;
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
  };
  motionEnergy: number;
}

export interface CinematicShowDocument {
  schemaVersion: 3;
  id: string;
  title: string;
  cueOrder: readonly StageEventId[];
  cues: Readonly<Record<StageEventId, CinematicCue>>;
}

const cueOrder = [
  'open_brand',
  'reveal_product',
  'explain_value',
  'grow_system',
  'summon_dynamic_chart',
  'hold',
  'resolve',
] as const satisfies readonly StageEventId[];

export const omniVyxCinematicShow: CinematicShowDocument = {
  schemaVersion: 3,
  id: 'omnivyx-vision-launch',
  title: 'OmniVyx Vision',
  cueOrder,
  cues: {
    open_brand: {
      copy: {
        eyebrow: 'OmniVyx Vision',
        headline: 'The stage is listening.',
        headlineLines: ['The stage is', 'listening.'],
        body: 'A cinematic presentation system directed by the meaning and rhythm of your voice.',
      },
      camera: { position: [0, 1.55, 7.5], target: [0, 0.05, 0], fov: 42 },
      transition: {
        durationMs: 1_600,
        damping: 3.8,
        copyDelayMs: 100,
        copyOffset: [0, 36],
        sweepAngle: 0.15,
        sweepIntensity: 0.74,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.34,
        scale: 1.03,
        offset: [0.22, 0.04],
        depth: -4.7,
        drift: 0.34,
        tintStrength: 0.28,
      },
      composition: {
        coreScale: 0.72,
        growthScale: 0.03,
        chartScale: 0.02,
        ribbonLift: -0.05,
        glassSpread: 1.08,
        heroX: 0.25,
        heroY: 0.22,
        heroYaw: 0.08,
      },
      lighting: { key: 1.85, rim: 3.8, accent: 2.6 },
      palette: {
        primary: '#8fe8f3',
        secondary: '#d9f7f2',
        accent: '#e4b967',
        surface: '#07111a',
      },
      motionEnergy: 0.62,
    },
    reveal_product: {
      copy: {
        eyebrow: 'Introducing OmniVyx',
        headline: 'Presentations, performed.',
        headlineLines: ['Presentations,', 'performed.'],
        body: 'Not a sequence of slides. A responsive visual world that moves with the room.',
      },
      camera: { position: [-0.62, 1.34, 6.08], target: [0.08, 0.1, 0], fov: 38 },
      transition: {
        durationMs: 1_150,
        damping: 5.6,
        copyDelayMs: 80,
        copyOffset: [-72, 12],
        sweepAngle: 0,
        sweepIntensity: 0.95,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.48,
        scale: 1.08,
        offset: [-0.08, 0.04],
        depth: -4.25,
        drift: 0.66,
        tintStrength: 0.16,
      },
      composition: {
        coreScale: 1.12,
        growthScale: 0.04,
        chartScale: 0.02,
        ribbonLift: 0.24,
        glassSpread: 1.22,
        heroX: 1.35,
        heroY: 0.28,
        heroYaw: -0.2,
      },
      lighting: { key: 2.7, rim: 5.2, accent: 3.4 },
      palette: {
        primary: '#76edf4',
        secondary: '#f4fbff',
        accent: '#f1bd5e',
        surface: '#081019',
      },
      motionEnergy: 1.15,
    },
    explain_value: {
      copy: {
        eyebrow: 'Live direction',
        headline: 'Intent becomes motion.',
        headlineLines: ['Intent becomes', 'motion.'],
        body: 'Your words shape composition, pacing, emphasis, and the next visual beat in real time.',
      },
      camera: { position: [0.34, 1.43, 6.72], target: [-0.2, 0.12, -0.15], fov: 40 },
      transition: {
        durationMs: 1_300,
        damping: 4.8,
        copyDelayMs: 100,
        copyOffset: [0, 42],
        sweepAngle: 1.15,
        sweepIntensity: 0.8,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.4,
        scale: 1.05,
        offset: [0.1, -0.02],
        depth: -4.5,
        drift: 0.46,
        tintStrength: 0.38,
      },
      composition: {
        coreScale: 0.92,
        growthScale: 0.05,
        chartScale: 0.02,
        ribbonLift: 0.06,
        glassSpread: 0.94,
        heroX: 1.15,
        heroY: 0.18,
        heroYaw: 0.16,
      },
      lighting: { key: 2.25, rim: 4.4, accent: 4.2 },
      palette: {
        primary: '#8ab8ff',
        secondary: '#dce9ff',
        accent: '#ff9b7a',
        surface: '#09111d',
      },
      motionEnergy: 0.82,
    },
    grow_system: {
      copy: {
        eyebrow: 'Generative narrative',
        headline: 'Every idea can grow.',
        headlineLines: ['Every idea', 'can grow.'],
        body: 'Stories, evidence, live data, and generated worlds remain part of one continuous composition.',
      },
      camera: { position: [0.92, 1.2, 6.2], target: [0.42, 0.22, -0.1], fov: 39 },
      transition: {
        durationMs: 1_700,
        damping: 3.4,
        copyDelayMs: 120,
        copyOffset: [46, 28],
        sweepAngle: -0.55,
        sweepIntensity: 0.88,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.3,
        scale: 1.02,
        offset: [0.18, 0.02],
        depth: -4.8,
        drift: 0.38,
        tintStrength: 0.58,
      },
      composition: {
        coreScale: 0.04,
        growthScale: 1,
        chartScale: 0.02,
        ribbonLift: 0.12,
        glassSpread: 1.14,
        heroX: -0.65,
        heroY: 0.08,
        heroYaw: -0.12,
      },
      lighting: { key: 2.05, rim: 3.6, accent: 3.1 },
      palette: {
        primary: '#76e6ad',
        secondary: '#c8f6de',
        accent: '#e8c66f',
        surface: '#07140f',
      },
      motionEnergy: 0.54,
    },
    summon_dynamic_chart: {
      copy: {
        eyebrow: 'Dynamic evidence',
        headline: 'The numbers arrive on cue.',
        headlineLines: ['The numbers', 'arrive on cue.'],
        body: 'Prepared data enters the stage when the conversation needs it, then yields to the story.',
      },
      camera: { position: [0.46, 1.28, 5.82], target: [0.48, 0.08, 0.18], fov: 37 },
      transition: {
        durationMs: 900,
        damping: 6.4,
        copyDelayMs: 60,
        copyOffset: [84, 0],
        sweepAngle: 3.1416,
        sweepIntensity: 1.1,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.24,
        scale: 1.1,
        offset: [-0.14, 0.03],
        depth: -5,
        drift: 0.24,
        tintStrength: 0.46,
      },
      composition: {
        coreScale: 0.02,
        growthScale: 0.04,
        chartScale: 1,
        ribbonLift: -0.04,
        glassSpread: 1.3,
        heroX: -1.05,
        heroY: 0.12,
        heroYaw: 0.2,
      },
      lighting: { key: 2.4, rim: 4.8, accent: 4.6 },
      palette: {
        primary: '#59ddec',
        secondary: '#baf5f4',
        accent: '#ffd66b',
        surface: '#07131b',
      },
      motionEnergy: 0.9,
    },
    hold: {
      copy: {
        eyebrow: 'Hold the room',
        headline: 'Stay with the moment.',
        headlineLines: ['Stay with', 'the moment.'],
        body: 'The stage keeps breathing without competing with the presenter or forcing the next beat.',
      },
      camera: { position: [0.16, 1.35, 6.82], target: [0, 0.08, 0], fov: 41 },
      transition: {
        durationMs: 1_900,
        damping: 3,
        copyDelayMs: 160,
        copyOffset: [0, 14],
        sweepAngle: 1.5708,
        sweepIntensity: 0.25,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.18,
        scale: 1,
        offset: [0.08, 0],
        depth: -5.1,
        drift: 0.12,
        tintStrength: 0.42,
      },
      composition: {
        coreScale: 0.52,
        growthScale: 0.38,
        chartScale: 0.02,
        ribbonLift: 0.02,
        glassSpread: 1,
        heroX: 0.4,
        heroY: 0.16,
        heroYaw: 0.05,
      },
      lighting: { key: 1.8, rim: 3.1, accent: 2.3 },
      palette: {
        primary: '#9fcbd4',
        secondary: '#dce9e9',
        accent: '#c6a96d',
        surface: '#0a1015',
      },
      motionEnergy: 0.24,
    },
    resolve: {
      copy: {
        eyebrow: 'One continuous performance',
        headline: 'Make the room feel it.',
        headlineLines: ['Make the room', 'feel it.'],
        body: 'Authored with AI. Rehearsed with a human. Performed together, live.',
      },
      camera: { position: [0, 1.45, 6.38], target: [0.08, 0.1, 0], fov: 39 },
      transition: {
        durationMs: 1_850,
        damping: 3.6,
        copyDelayMs: 110,
        copyOffset: [-40, 32],
        sweepAngle: 0.35,
        sweepIntensity: 1,
      },
      media: {
        asset: '/engine/optical-master-v1.jpg',
        opacity: 0.42,
        scale: 1.06,
        offset: [0, 0.04],
        depth: -4.45,
        drift: 0.44,
        tintStrength: 0.24,
      },
      composition: {
        coreScale: 1.02,
        growthScale: 0.82,
        chartScale: 0.78,
        ribbonLift: 0.2,
        glassSpread: 1.1,
        heroX: 0.65,
        heroY: 0.22,
        heroYaw: -0.08,
      },
      lighting: { key: 2.8, rim: 5.3, accent: 3.8 },
      palette: {
        primary: '#a8f1f1',
        secondary: '#f4f7f5',
        accent: '#f2c76e',
        surface: '#080f16',
      },
      motionEnergy: 0.68,
    },
  },
};

export function getCinematicCue(eventId: StageEventId): CinematicCue {
  return omniVyxCinematicShow.cues[eventId];
}

export function dampingForDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('Transition duration must be a positive finite number.');
  }

  return Math.log(20) / (durationMs / 1_000);
}
