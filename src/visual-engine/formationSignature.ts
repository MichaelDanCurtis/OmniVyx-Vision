export const formationSignatures = [
  'listening_orbit',
  'product_monolith',
  'directional_split',
  'living_canopy',
  'evidence_rail',
  'quiet_suspension',
  'final_convergence',
] as const;

export type FormationSignature = (typeof formationSignatures)[number];

type Vector2Tuple = readonly [number, number];
type Vector3Tuple = readonly [number, number, number];

export interface StageFormationProfile {
  glass: {
    arc: number;
    convergence: number;
    corridor: number;
    depthScale: number;
    lift: number;
    opacity: number;
    scale: number;
    yaw: number;
  };
  hero: {
    aspect: Vector3Tuple;
    finSpread: number;
    finTwist: number;
    tilt: Vector2Tuple;
  };
  network: {
    aspect: Vector2Tuple;
    offset: Vector2Tuple;
    rotation: number;
  };
  silk: {
    lift: Vector2Tuple;
    opacity: Vector2Tuple;
    roll: Vector2Tuple;
    span: Vector2Tuple;
    yaw: Vector2Tuple;
  };
}

export const stageFormationProfiles: Readonly<Record<FormationSignature, StageFormationProfile>> = {
  listening_orbit: {
    glass: {
      arc: 0.24,
      convergence: 0.12,
      corridor: 0.08,
      depthScale: 1.08,
      lift: 0.04,
      opacity: 0.74,
      scale: 0.9,
      yaw: 0.18,
    },
    hero: {
      aspect: [0.96, 0.96, 1],
      finSpread: 0.04,
      finTwist: 0.08,
      tilt: [0.01, -0.015],
    },
    network: {
      aspect: [0.92, 0.92],
      offset: [0, 0],
      rotation: 0,
    },
    silk: {
      lift: [0, 0.02],
      opacity: [0.94, 0.82],
      roll: [-0.02, -0.07],
      span: [1.02, 0.98],
      yaw: [-0.035, -0.05],
    },
  },
  product_monolith: {
    glass: {
      arc: 0.1,
      convergence: 0.3,
      corridor: 0.18,
      depthScale: 1.18,
      lift: 0.06,
      opacity: 0.88,
      scale: 1.04,
      yaw: 0.42,
    },
    hero: {
      aspect: [1, 1.04, 1],
      finSpread: 0.11,
      finTwist: -0.05,
      tilt: [-0.025, -0.018],
    },
    network: {
      aspect: [0.9, 0.94],
      offset: [0.1, -0.05],
      rotation: -0.03,
    },
    silk: {
      lift: [0.05, 0.22],
      opacity: [1, 0.94],
      roll: [-0.015, -0.12],
      span: [1.08, 1.12],
      yaw: [-0.05, -0.1],
    },
  },
  directional_split: {
    glass: {
      arc: -0.16,
      convergence: 0.08,
      corridor: 0.82,
      depthScale: 0.92,
      lift: -0.02,
      opacity: 0.76,
      scale: 0.76,
      yaw: 0.68,
    },
    hero: {
      aspect: [0.88, 1.04, 1],
      finSpread: 0.18,
      finTwist: 0.22,
      tilt: [-0.04, 0.055],
    },
    network: {
      aspect: [1.08, 0.88],
      offset: [0.12, 0.04],
      rotation: 0.07,
    },
    silk: {
      lift: [-0.02, 0.12],
      opacity: [0.9, 0.78],
      roll: [0.045, -0.15],
      span: [1.06, 1.02],
      yaw: [0.015, -0.16],
    },
  },
  living_canopy: {
    glass: {
      arc: 0.86,
      convergence: 0.04,
      corridor: 0.12,
      depthScale: 1.16,
      lift: 0.38,
      opacity: 0.48,
      scale: 0.68,
      yaw: 0.28,
    },
    hero: {
      aspect: [0.82, 0.9, 1],
      finSpread: 0.2,
      finTwist: 0.16,
      tilt: [0.04, -0.04],
    },
    network: {
      aspect: [1.14, 1.08],
      offset: [-0.08, 0.22],
      rotation: -0.045,
    },
    silk: {
      lift: [0.14, 0.48],
      opacity: [0.9, 0.68],
      roll: [0.02, -0.18],
      span: [1.12, 1.18],
      yaw: [-0.02, -0.2],
    },
  },
  evidence_rail: {
    glass: {
      arc: 0,
      convergence: 0.05,
      corridor: 0.94,
      depthScale: 1.34,
      lift: 0.34,
      opacity: 0.34,
      scale: 0.58,
      yaw: 0.08,
    },
    hero: {
      aspect: [0.9, 0.9, 1],
      finSpread: 0.02,
      finTwist: 0,
      tilt: [0, 0],
    },
    network: {
      aspect: [0.96, 0.9],
      offset: [0.16, -0.06],
      rotation: 0,
    },
    silk: {
      lift: [-0.12, -0.06],
      opacity: [0.62, 0.28],
      roll: [-0.01, -0.04],
      span: [1.04, 0.92],
      yaw: [-0.02, -0.04],
    },
  },
  quiet_suspension: {
    glass: {
      arc: 0.16,
      convergence: 0.4,
      corridor: 0.04,
      depthScale: 1.48,
      lift: 0.14,
      opacity: 0.3,
      scale: 0.58,
      yaw: 0.1,
    },
    hero: {
      aspect: [0.9, 0.9, 1],
      finSpread: -0.035,
      finTwist: 0.02,
      tilt: [0.015, 0.008],
    },
    network: {
      aspect: [0.88, 0.88],
      offset: [0, -0.08],
      rotation: 0,
    },
    silk: {
      lift: [-0.08, -0.02],
      opacity: [0.68, 0.4],
      roll: [-0.015, -0.045],
      span: [0.9, 0.84],
      yaw: [-0.02, -0.035],
    },
  },
  final_convergence: {
    glass: {
      arc: 0.42,
      convergence: 0.52,
      corridor: 0.28,
      depthScale: 0.84,
      lift: 0.1,
      opacity: 0.9,
      scale: 0.92,
      yaw: 0.82,
    },
    hero: {
      aspect: [1.04, 1, 1],
      finSpread: 0.22,
      finTwist: 0.3,
      tilt: [-0.03, -0.025],
    },
    network: {
      aspect: [0.9, 0.94],
      offset: [0.18, 0.16],
      rotation: 0.08,
    },
    silk: {
      lift: [0.08, 0.38],
      opacity: [1, 0.96],
      roll: [0.025, -0.2],
      span: [1.14, 1.22],
      yaw: [-0.02, -0.22],
    },
  },
};

const formationSignatureIndices: Readonly<Record<FormationSignature, number>> = {
  listening_orbit: 0,
  product_monolith: 1,
  directional_split: 2,
  living_canopy: 3,
  evidence_rail: 4,
  quiet_suspension: 5,
  final_convergence: 6,
};

export function formationSignatureIndex(signature: FormationSignature): number {
  return formationSignatureIndices[signature];
}

export function getStageFormation(signature: FormationSignature): StageFormationProfile {
  return stageFormationProfiles[signature];
}
