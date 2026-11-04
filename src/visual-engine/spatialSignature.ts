export const spatialSignatures = [
  'listening_atrium',
  'product_proscenium',
  'directional_corridor',
  'canopy_volume',
  'evidence_gallery',
  'quiet_shallow',
  'convergence_stack',
] as const;

export type SpatialSignature = (typeof spatialSignatures)[number];

export interface WorldPosition {
  x: number;
  y: number;
  z: number;
}

export function resolveWorldFocusDistance(
  camera: WorldPosition,
  target: readonly [number, number, number],
  offset: number,
): number {
  return Math.max(
    0.1,
    Math.hypot(
      camera.x - target[0],
      camera.y - target[1],
      camera.z - target[2],
    ) + offset,
  );
}
