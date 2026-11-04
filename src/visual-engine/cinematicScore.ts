import type { StageEventId } from './stageScore';
import type {
  CueMotionProfile,
  MotionPhaseWindow,
  MotionSignature,
} from './motionEnvelope';
import type { CuePacingProfile } from './cuePacing';
import type { FormationSignature } from './formationSignature';
import type { SceneSignature } from './sceneSignature';
import type { TypographySignature } from './kineticCopy';
import type { SpatialSignature } from './spatialSignature';

export type Vector3Tuple = readonly [number, number, number];
export type Vector2Tuple = readonly [number, number];
export type TransitionSignature =
  | 'aperture_reveal'
  | 'convergence'
  | 'data_scan'
  | 'organic_bloom'
  | 'prism_sweep'
  | 'ribbon_fold'
  | 'soft_hold';

const transitionSignatureIndices: Readonly<Record<TransitionSignature, number>> = {
  prism_sweep: 0,
  aperture_reveal: 1,
  ribbon_fold: 2,
  organic_bloom: 3,
  data_scan: 4,
  soft_hold: 5,
  convergence: 6,
};

export function transitionSignatureIndex(signature: TransitionSignature): number {
  return transitionSignatureIndices[signature];
}

export interface CinematicCue {
  copy: {
    eyebrow: string;
    emphasisWords: readonly string[];
    headline: string;
    headlineLines: readonly string[];
    signature: TypographySignature;
    body: string;
  };
  camera: {
    position: Vector3Tuple;
    target: Vector3Tuple;
    fov: number;
    shot: {
      positionArc: Vector3Tuple;
      targetArc: Vector3Tuple;
      roll: number;
      fovArc: number;
    };
    portrait: {
      targetOffset: Vector3Tuple;
      pullback: number;
    };
  };
  transition: {
    durationMs: number;
    damping: number;
    copyDelayMs: number;
    copyOffset: Vector2Tuple;
    signature: TransitionSignature;
    sweepAngle: number;
    sweepIntensity: number;
    motion: CueMotionProfile & { signature: MotionSignature };
    pacing: CuePacingProfile;
    staging: {
      camera: MotionPhaseWindow;
      media: MotionPhaseWindow;
      actors: MotionPhaseWindow;
      copy: MotionPhaseWindow;
    };
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
    signature: FormationSignature;
    coreScale: number;
    growthScale: number;
    chartScale: number;
    ribbonLift: number;
    glassSpread: number;
    heroX: number;
    heroY: number;
    heroYaw: number;
  };
  spatial: {
    signature: SpatialSignature;
    silkDepth: Vector2Tuple;
    glassDepthOffset: number;
    glassDepthSpread: number;
    heroDepth: number;
    networkDepth: number;
    parallax: number;
    focusTarget: Vector3Tuple;
  };
  evidence: {
    position: Vector3Tuple;
    rotation: Vector3Tuple;
    spread: number;
  };
  lighting: {
    ambient: number;
    beam: number;
    focus: Vector2Tuple;
    focusSize: number;
    key: number;
    negativeSpace: number;
    rim: number;
    accent: number;
  };
  environment: {
    signature: SceneSignature;
    glow: number;
    glowPosition: Vector2Tuple;
    horizon: number;
    ribbons: number;
    grid: number;
    particles: number;
    particleSize: number;
    drift: number;
  };
  lens: {
    bloom: number;
    focusOffset: number;
    focusRange: number;
    bokehScale: number;
    vignetteDarkness: number;
    vignetteOffset: number;
    exposure: number;
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
  schemaVersion: 16;
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
  schemaVersion: 16,
  id: 'omnivyx-vision-launch',
  title: 'OmniVyx Vision',
  cueOrder,
  cues: {
    open_brand: {
      copy: {
        eyebrow: 'OmniVyx Vision',
        emphasisWords: ['listening'],
        headline: 'The stage is listening.',
        headlineLines: ['The stage is', 'listening.'],
        signature: 'listening_monument',
        body: 'A cinematic presentation system directed by the meaning and rhythm of your voice.',
      },
      camera: {
        position: [0, 1.55, 7.5],
        target: [0, 0.05, 0],
        fov: 42,
        shot: {
          positionArc: [-0.18, 0.14, -0.28],
          targetArc: [0.08, 0.04, 0],
          roll: -0.012,
          fovArc: -0.8,
        },
        portrait: {
          targetOffset: [0.2, -0.04, 0],
          pullback: 0.9,
        },
      },
      transition: {
        durationMs: 1_600,
        damping: 3.8,
        copyDelayMs: 100,
        copyOffset: [0, 36],
        signature: 'prism_sweep',
        sweepAngle: 0.15,
        sweepIntensity: 0.74,
        motion: {
          signature: 'ambient_establish',
          arrivalPower: 3.2,
          impactAmplitude: 0.58,
          impactDecay: 7.2,
          overshootAmplitude: 0.14,
          overshootDecay: 3.8,
          overshootSkew: 1.1,
        },
        pacing: {
          idleRate: 0.9,
          minimumRate: 0.82,
          maximumRate: 1.06,
          energyGain: 0.12,
          peakGain: 0.05,
        },
        staging: {
          camera: [0, 0.42],
          media: [0.02, 0.78],
          actors: [0.16, 0.86],
          copy: [0.22, 0.72],
        },
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
        signature: 'listening_orbit',
        coreScale: 0.72,
        growthScale: 0.03,
        chartScale: 0.02,
        ribbonLift: -0.05,
        glassSpread: 1.08,
        heroX: 0.25,
        heroY: 0.22,
        heroYaw: 0.08,
      },
      spatial: {
        signature: 'listening_atrium',
        silkDepth: [-2, -0.58],
        glassDepthOffset: 0,
        glassDepthSpread: 1,
        heroDepth: 0.14,
        networkDepth: 0.18,
        parallax: 0.18,
        focusTarget: [0.25, 0.22, 0.14],
      },
      evidence: {
        position: [1.7, -0.18, -0.42],
        rotation: [-0.04, -0.16, 0.01],
        spread: 0.96,
      },
      lighting: {
        ambient: 0.2,
        beam: 0.28,
        focus: [0.67, 0.57],
        focusSize: 0.62,
        key: 1.85,
        negativeSpace: 0.56,
        rim: 3.8,
        accent: 2.6,
      },
      environment: {
        signature: 'listening_field',
        glow: 0.32,
        glowPosition: [0.24, 0.16],
        horizon: 0.38,
        ribbons: 0.18,
        grid: 0.03,
        particles: 0.26,
        particleSize: 0.018,
        drift: 0.1,
      },
      lens: {
        bloom: 0.42,
        focusOffset: -0.2,
        focusRange: 4.2,
        bokehScale: 0.78,
        vignetteDarkness: 0.44,
        vignetteOffset: 0.2,
        exposure: 1,
      },
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
        emphasisWords: ['performed'],
        headline: 'Presentations, performed.',
        headlineLines: ['Presentations,', 'performed.'],
        signature: 'product_lockup',
        body: 'Not a sequence of slides. A responsive visual world that moves with the room.',
      },
      camera: {
        position: [-0.62, 1.34, 6.08],
        target: [0.08, 0.1, 0],
        fov: 38,
        shot: {
          positionArc: [-0.58, 0.18, -0.82],
          targetArc: [0.22, 0.06, 0],
          roll: -0.025,
          fovArc: -2.2,
        },
        portrait: {
          targetOffset: [1.12, -0.12, 0],
          pullback: 2,
        },
      },
      transition: {
        durationMs: 1_150,
        damping: 5.6,
        copyDelayMs: 80,
        copyOffset: [-72, 12],
        signature: 'aperture_reveal',
        sweepAngle: 0,
        sweepIntensity: 0.95,
        motion: {
          signature: 'precision_reveal',
          arrivalPower: 5.4,
          impactAmplitude: 1.05,
          impactDecay: 5.2,
          overshootAmplitude: 0.75,
          overshootDecay: 2,
          overshootSkew: 0.82,
        },
        pacing: {
          idleRate: 1,
          minimumRate: 0.92,
          maximumRate: 1.24,
          energyGain: 0.24,
          peakGain: 0.09,
        },
        staging: {
          camera: [0, 0.38],
          media: [0.04, 0.72],
          actors: [0.12, 0.78],
          copy: [0.18, 0.68],
        },
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
        signature: 'product_monolith',
        coreScale: 1.12,
        growthScale: 0.04,
        chartScale: 0.02,
        ribbonLift: 0.24,
        glassSpread: 1.22,
        heroX: 1.35,
        heroY: 0.28,
        heroYaw: -0.2,
      },
      spatial: {
        signature: 'product_proscenium',
        silkDepth: [-2.55, -0.35],
        glassDepthOffset: -0.15,
        glassDepthSpread: 1.18,
        heroDepth: 0.42,
        networkDepth: -0.35,
        parallax: 0.52,
        focusTarget: [1.35, 0.28, 0.42],
      },
      evidence: {
        position: [1.7, -0.18, -0.42],
        rotation: [-0.04, -0.16, 0.01],
        spread: 0.96,
      },
      lighting: {
        ambient: 0.17,
        beam: 0.64,
        focus: [0.67, 0.55],
        focusSize: 0.5,
        key: 2.7,
        negativeSpace: 0.64,
        rim: 5.2,
        accent: 3.4,
      },
      environment: {
        signature: 'aperture_chamber',
        glow: 0.62,
        glowPosition: [0.3, 0.12],
        horizon: 0.52,
        ribbons: 0.44,
        grid: 0.04,
        particles: 0.38,
        particleSize: 0.021,
        drift: 0.26,
      },
      lens: {
        bloom: 0.62,
        focusOffset: -0.12,
        focusRange: 2.6,
        bokehScale: 1.25,
        vignetteDarkness: 0.48,
        vignetteOffset: 0.18,
        exposure: 1.08,
      },
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
        emphasisWords: ['Intent', 'motion'],
        headline: 'Intent becomes motion.',
        headlineLines: ['Intent becomes', 'motion.'],
        signature: 'vector_split',
        body: 'Your words shape composition, pacing, emphasis, and the next visual beat in real time.',
      },
      camera: {
        position: [0.34, 1.43, 6.72],
        target: [-0.2, 0.12, -0.15],
        fov: 40,
        shot: {
          positionArc: [0.42, -0.08, 0.36],
          targetArc: [-0.24, 0.08, 0],
          roll: 0.018,
          fovArc: 1.2,
        },
        portrait: {
          targetOffset: [0.72, -0.08, 0],
          pullback: 1.2,
        },
      },
      transition: {
        durationMs: 1_300,
        damping: 4.8,
        copyDelayMs: 100,
        copyOffset: [0, 42],
        signature: 'ribbon_fold',
        sweepAngle: 1.15,
        sweepIntensity: 0.8,
        motion: {
          signature: 'directed_glide',
          arrivalPower: 3.8,
          impactAmplitude: 0.78,
          impactDecay: 6.1,
          overshootAmplitude: 0.34,
          overshootDecay: 2.8,
          overshootSkew: 1.18,
        },
        pacing: {
          idleRate: 0.96,
          minimumRate: 0.88,
          maximumRate: 1.16,
          energyGain: 0.16,
          peakGain: 0.06,
        },
        staging: {
          camera: [0, 0.46],
          media: [0.08, 0.78],
          actors: [0.16, 0.84],
          copy: [0.24, 0.76],
        },
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
        signature: 'directional_split',
        coreScale: 0.86,
        growthScale: 0.05,
        chartScale: 0.02,
        ribbonLift: 0.06,
        glassSpread: 0.88,
        heroX: 1.42,
        heroY: 0.24,
        heroYaw: 0.34,
      },
      spatial: {
        signature: 'directional_corridor',
        silkDepth: [-2.65, -0.72],
        glassDepthOffset: 0.12,
        glassDepthSpread: 1.32,
        heroDepth: 0.18,
        networkDepth: -0.15,
        parallax: 0.72,
        focusTarget: [1.42, 0.24, 0.18],
      },
      evidence: {
        position: [1.7, -0.18, -0.42],
        rotation: [-0.04, -0.16, 0.01],
        spread: 0.96,
      },
      lighting: {
        ambient: 0.19,
        beam: 0.46,
        focus: [0.69, 0.54],
        focusSize: 0.58,
        key: 2.25,
        negativeSpace: 0.6,
        rim: 4.4,
        accent: 4.2,
      },
      environment: {
        signature: 'vector_flow',
        glow: 0.48,
        glowPosition: [-0.08, 0.12],
        horizon: 0.36,
        ribbons: 0.3,
        grid: 0.18,
        particles: 0.3,
        particleSize: 0.018,
        drift: 0.18,
      },
      lens: {
        bloom: 0.46,
        focusOffset: -0.34,
        focusRange: 4,
        bokehScale: 0.75,
        vignetteDarkness: 0.42,
        vignetteOffset: 0.22,
        exposure: 0.98,
      },
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
        emphasisWords: ['grow'],
        headline: 'Every idea can grow.',
        headlineLines: ['Every idea', 'can grow.'],
        signature: 'organic_rise',
        body: 'Stories, evidence, live data, and generated worlds remain part of one continuous composition.',
      },
      camera: {
        position: [0.92, 1.2, 6.2],
        target: [0.42, 0.22, -0.1],
        fov: 39,
        shot: {
          positionArc: [0.62, 0.26, -0.22],
          targetArc: [0.26, 0.18, 0],
          roll: 0.022,
          fovArc: -1,
        },
        portrait: {
          targetOffset: [1, -0.1, 0],
          pullback: 1.2,
        },
      },
      transition: {
        durationMs: 1_700,
        damping: 3.4,
        copyDelayMs: 120,
        copyOffset: [46, 28],
        signature: 'organic_bloom',
        sweepAngle: -0.55,
        sweepIntensity: 0.88,
        motion: {
          signature: 'organic_unfurl',
          arrivalPower: 2.7,
          impactAmplitude: 0.64,
          impactDecay: 4.2,
          overshootAmplitude: 0.55,
          overshootDecay: 1.55,
          overshootSkew: 1.42,
        },
        pacing: {
          idleRate: 0.88,
          minimumRate: 0.78,
          maximumRate: 1.08,
          energyGain: 0.12,
          peakGain: 0.05,
        },
        staging: {
          camera: [0, 0.44],
          media: [0.06, 0.82],
          actors: [0.2, 0.92],
          copy: [0.24, 0.78],
        },
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
        signature: 'living_canopy',
        coreScale: 0.04,
        growthScale: 1,
        chartScale: 0.02,
        ribbonLift: 0.12,
        glassSpread: 1.14,
        heroX: -0.65,
        heroY: 0.08,
        heroYaw: -0.12,
      },
      spatial: {
        signature: 'canopy_volume',
        silkDepth: [-2.35, -0.98],
        glassDepthOffset: -0.28,
        glassDepthSpread: 1.05,
        heroDepth: -0.45,
        networkDepth: 0.52,
        parallax: 0.45,
        focusTarget: [1.45, 0.18, 0.52],
      },
      evidence: {
        position: [1.7, -0.18, -0.42],
        rotation: [-0.04, -0.16, 0.01],
        spread: 0.96,
      },
      lighting: {
        ambient: 0.15,
        beam: 0.52,
        focus: [0.68, 0.59],
        focusSize: 0.66,
        key: 2.05,
        negativeSpace: 0.54,
        rim: 3.6,
        accent: 3.1,
      },
      environment: {
        signature: 'living_canopy',
        glow: 0.58,
        glowPosition: [0.36, 0.14],
        horizon: 0.44,
        ribbons: 0.72,
        grid: 0.02,
        particles: 0.5,
        particleSize: 0.021,
        drift: 0.22,
      },
      lens: {
        bloom: 0.44,
        focusOffset: -0.24,
        focusRange: 3.4,
        bokehScale: 0.9,
        vignetteDarkness: 0.4,
        vignetteOffset: 0.22,
        exposure: 1.02,
      },
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
        emphasisWords: ['numbers', 'cue'],
        headline: 'The numbers arrive on cue.',
        headlineLines: ['The numbers', 'arrive on cue.'],
        signature: 'evidence_precision',
        body: 'Prepared data enters the stage when the conversation needs it, then yields to the story.',
      },
      camera: {
        position: [0.46, 1.28, 5.82],
        target: [0.48, 0.08, 0.18],
        fov: 37,
        shot: {
          positionArc: [-0.38, 0.04, -0.62],
          targetArc: [0.32, 0.02, 0],
          roll: -0.012,
          fovArc: -1.8,
        },
        portrait: {
          targetOffset: [0.2, -0.04, 0],
          pullback: 1,
        },
      },
      transition: {
        durationMs: 900,
        damping: 6.4,
        copyDelayMs: 60,
        copyOffset: [84, 0],
        signature: 'data_scan',
        sweepAngle: 3.1416,
        sweepIntensity: 1.1,
        motion: {
          signature: 'evidence_lock',
          arrivalPower: 6.2,
          impactAmplitude: 1.08,
          impactDecay: 7.8,
          overshootAmplitude: 0.18,
          overshootDecay: 4.2,
          overshootSkew: 0.72,
        },
        pacing: {
          idleRate: 1.06,
          minimumRate: 0.96,
          maximumRate: 1.32,
          energyGain: 0.26,
          peakGain: 0.1,
        },
        staging: {
          camera: [0, 0.32],
          media: [0.02, 0.58],
          actors: [0.1, 0.68],
          copy: [0.16, 0.54],
        },
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
        signature: 'evidence_rail',
        coreScale: 0.02,
        growthScale: 0.04,
        chartScale: 1,
        ribbonLift: -0.04,
        glassSpread: 1.3,
        heroX: -1.05,
        heroY: 0.12,
        heroYaw: 0.2,
      },
      spatial: {
        signature: 'evidence_gallery',
        silkDepth: [-3.05, -1.35],
        glassDepthOffset: -0.6,
        glassDepthSpread: 0.92,
        heroDepth: -0.65,
        networkDepth: -0.85,
        parallax: 0.2,
        focusTarget: [1.72, 0.24, -0.3],
      },
      evidence: {
        position: [1.72, -0.24, -0.3],
        rotation: [-0.035, -0.2, 0.015],
        spread: 1.08,
      },
      lighting: {
        ambient: 0.18,
        beam: 0.22,
        focus: [0.7, 0.62],
        focusSize: 0.46,
        key: 2.4,
        negativeSpace: 0.7,
        rim: 4.8,
        accent: 4.6,
      },
      environment: {
        signature: 'evidence_matrix',
        glow: 0.3,
        glowPosition: [0.5, 0.3],
        horizon: 0.24,
        ribbons: 0.08,
        grid: 0.58,
        particles: 0.16,
        particleSize: 0.014,
        drift: 0.06,
      },
      lens: {
        bloom: 0.3,
        focusOffset: -0.18,
        focusRange: 8,
        bokehScale: 0.15,
        vignetteDarkness: 0.3,
        vignetteOffset: 0.27,
        exposure: 0.92,
      },
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
        emphasisWords: ['moment'],
        headline: 'Stay with the moment.',
        headlineLines: ['Stay with', 'the moment.'],
        signature: 'quiet_statement',
        body: 'The stage keeps breathing without competing with the presenter or forcing the next beat.',
      },
      camera: {
        position: [0.16, 1.35, 6.82],
        target: [0, 0.08, 0],
        fov: 41,
        shot: {
          positionArc: [0, 0.1, 0.48],
          targetArc: [0, 0, 0],
          roll: 0,
          fovArc: 1.4,
        },
        portrait: {
          targetOffset: [0.34, -0.06, 0],
          pullback: 1,
        },
      },
      transition: {
        durationMs: 1_900,
        damping: 3,
        copyDelayMs: 160,
        copyOffset: [0, 14],
        signature: 'soft_hold',
        sweepAngle: 1.5708,
        sweepIntensity: 0.25,
        motion: {
          signature: 'sustained_breath',
          arrivalPower: 2.2,
          impactAmplitude: 0.35,
          impactDecay: 9,
          overshootAmplitude: 0.08,
          overshootDecay: 5,
          overshootSkew: 1.2,
        },
        pacing: {
          idleRate: 0.82,
          minimumRate: 0.74,
          maximumRate: 1,
          energyGain: 0.08,
          peakGain: 0.03,
        },
        staging: {
          camera: [0, 0.58],
          media: [0.12, 0.9],
          actors: [0.24, 0.94],
          copy: [0.28, 0.78],
        },
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
        signature: 'quiet_suspension',
        coreScale: 0.7,
        growthScale: 0.04,
        chartScale: 0.02,
        ribbonLift: 0.02,
        glassSpread: 0.78,
        heroX: 0.72,
        heroY: 0.2,
        heroYaw: 0.14,
      },
      spatial: {
        signature: 'quiet_shallow',
        silkDepth: [-2.05, -1.18],
        glassDepthOffset: -0.2,
        glassDepthSpread: 0.78,
        heroDepth: 0.05,
        networkDepth: -0.7,
        parallax: 0.08,
        focusTarget: [0.72, 0.2, 0.05],
      },
      evidence: {
        position: [1.68, -0.2, -0.4],
        rotation: [-0.04, -0.16, 0.01],
        spread: 0.98,
      },
      lighting: {
        ambient: 0.13,
        beam: 0.16,
        focus: [0.63, 0.56],
        focusSize: 0.72,
        key: 1.8,
        negativeSpace: 0.66,
        rim: 3.1,
        accent: 2.3,
      },
      environment: {
        signature: 'quiet_vault',
        glow: 0.18,
        glowPosition: [0.08, 0.12],
        horizon: 0.14,
        ribbons: 0.1,
        grid: 0,
        particles: 0.14,
        particleSize: 0.014,
        drift: 0.03,
      },
      lens: {
        bloom: 0.28,
        focusOffset: -0.28,
        focusRange: 8,
        bokehScale: 0.3,
        vignetteDarkness: 0.34,
        vignetteOffset: 0.26,
        exposure: 0.9,
      },
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
        emphasisWords: ['feel'],
        headline: 'Make the room feel it.',
        headlineLines: ['Make the room', 'feel it.'],
        signature: 'finale_convergence',
        body: 'Authored with AI. Rehearsed with a human. Performed together, live.',
      },
      camera: {
        position: [0, 1.45, 6.38],
        target: [0.08, 0.1, 0],
        fov: 39,
        shot: {
          positionArc: [-0.46, 0.16, -0.72],
          targetArc: [0.12, 0.06, 0],
          roll: -0.018,
          fovArc: -1.6,
        },
        portrait: {
          targetOffset: [0.75, -0.1, 0],
          pullback: 1.4,
        },
      },
      transition: {
        durationMs: 1_850,
        damping: 3.6,
        copyDelayMs: 110,
        copyOffset: [-40, 32],
        signature: 'convergence',
        sweepAngle: 0.35,
        sweepIntensity: 1,
        motion: {
          signature: 'crescendo_converge',
          arrivalPower: 4.5,
          impactAmplitude: 1,
          impactDecay: 4.6,
          overshootAmplitude: 0.62,
          overshootDecay: 1.8,
          overshootSkew: 1.05,
        },
        pacing: {
          idleRate: 0.94,
          minimumRate: 0.84,
          maximumRate: 1.18,
          energyGain: 0.18,
          peakGain: 0.08,
        },
        staging: {
          camera: [0, 0.42],
          media: [0.05, 0.76],
          actors: [0.16, 0.86],
          copy: [0.24, 0.74],
        },
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
        signature: 'final_convergence',
        coreScale: 0.94,
        growthScale: 0.82,
        chartScale: 0.78,
        ribbonLift: 0.2,
        glassSpread: 1.1,
        heroX: 0.78,
        heroY: 0.22,
        heroYaw: -0.08,
      },
      spatial: {
        signature: 'convergence_stack',
        silkDepth: [-2.7, -0.42],
        glassDepthOffset: -0.1,
        glassDepthSpread: 1.45,
        heroDepth: 0.46,
        networkDepth: 0.25,
        parallax: 0.58,
        focusTarget: [0.86, 0.28, 0.42],
      },
      evidence: {
        position: [1.5, -0.18, -0.34],
        rotation: [-0.03, -0.12, 0.01],
        spread: 1.02,
      },
      lighting: {
        ambient: 0.17,
        beam: 0.58,
        focus: [0.67, 0.56],
        focusSize: 0.62,
        key: 2.8,
        negativeSpace: 0.6,
        rim: 5.3,
        accent: 3.8,
      },
      environment: {
        signature: 'final_convergence',
        glow: 0.68,
        glowPosition: [0.26, 0.16],
        horizon: 0.5,
        ribbons: 0.54,
        grid: 0.1,
        particles: 0.4,
        particleSize: 0.02,
        drift: 0.18,
      },
      lens: {
        bloom: 0.58,
        focusOffset: -0.12,
        focusRange: 3,
        bokehScale: 1.05,
        vignetteDarkness: 0.5,
        vignetteOffset: 0.18,
        exposure: 1.06,
      },
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
