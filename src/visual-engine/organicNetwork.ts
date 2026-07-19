type Position3 = readonly [number, number, number];

interface OrganicNode {
  parent: number | null;
  position: Position3;
}

export interface OrganicNetworkGeometry {
  edgeGrowth: Float32Array;
  edgePositions: Float32Array;
  edgeSeeds: Float32Array;
  edgeSides: Float32Array;
  nodeGrowth: Float32Array;
  nodePositions: Float32Array;
  nodeSeeds: Float32Array;
  nodeTerminal: Float32Array;
}

const nodes = [
  { parent: null, position: [0, -0.2, 0] },
  { parent: 0, position: [0.02, 0.1, 0.01] },
  { parent: 1, position: [-0.06, 0.42, 0.03] },
  { parent: 2, position: [0.06, 0.76, 0] },
  { parent: 3, position: [-0.02, 1.1, 0.04] },
  { parent: 4, position: [0.08, 1.44, 0.02] },
  { parent: 5, position: [0, 1.8, 0.06] },
  { parent: 1, position: [-0.3, 0.33, 0.03] },
  { parent: 7, position: [-0.62, 0.56, 0.08] },
  { parent: 8, position: [-0.95, 0.76, 0.11] },
  { parent: 8, position: [-0.75, 0.88, -0.01] },
  { parent: 2, position: [0.32, 0.62, 0.07] },
  { parent: 11, position: [0.66, 0.82, 0.02] },
  { parent: 12, position: [1.04, 1.02, 0.09] },
  { parent: 12, position: [0.78, 1.16, -0.02] },
  { parent: 3, position: [-0.36, 0.96, 0.08] },
  { parent: 15, position: [-0.73, 1.19, 0.03] },
  { parent: 16, position: [-1.12, 1.34, 0.11] },
  { parent: 16, position: [-0.84, 1.52, -0.01] },
  { parent: 4, position: [0.38, 1.27, 0.07] },
  { parent: 19, position: [0.78, 1.49, 0.02] },
  { parent: 20, position: [1.17, 1.65, 0.1] },
  { parent: 20, position: [0.94, 1.86, -0.02] },
  { parent: 5, position: [-0.32, 1.61, 0.08] },
  { parent: 23, position: [-0.68, 1.82, 0.03] },
  { parent: 24, position: [-1.02, 2.05, 0.11] },
  { parent: 24, position: [-0.74, 2.18, -0.01] },
  { parent: 6, position: [0.35, 2, 0.07] },
  { parent: 27, position: [0.76, 2.2, 0.02] },
  { parent: 27, position: [0.48, 2.36, 0.1] },
  { parent: 6, position: [-0.3, 2.02, 0.08] },
  { parent: 30, position: [-0.62, 2.25, 0.03] },
  { parent: 30, position: [-0.15, 2.42, 0.12] },
] as const satisfies readonly OrganicNode[];

export const ORGANIC_NETWORK_NODE_COUNT = nodes.length;
export const ORGANIC_NETWORK_EDGE_COUNT = nodes.length - 1;
export const ORGANIC_NETWORK_SEGMENTS_PER_EDGE = 6;
export const ORGANIC_NETWORK_VERTICES_PER_SEGMENT = 6;

function sampleQuadratic(
  start: Position3,
  control: Position3,
  end: Position3,
  t: number,
): Position3 {
  const inverse = 1 - t;
  return [
    inverse * inverse * start[0] + 2 * inverse * t * control[0] + t * t * end[0],
    inverse * inverse * start[1] + 2 * inverse * t * control[1] + t * t * end[1],
    inverse * inverse * start[2] + 2 * inverse * t * control[2] + t * t * end[2],
  ];
}

export function createOrganicNetworkGeometry(): OrganicNetworkGeometry {
  const edgePositions: number[] = [];
  const edgeGrowth: number[] = [];
  const edgeSeeds: number[] = [];
  const edgeSides: number[] = [];
  const nodePositions: number[] = [];
  const nodeGrowth: number[] = [];
  const nodeSeeds: number[] = [];
  const nodeTerminal: number[] = [];
  const parentIndexes = new Set<number>(nodes.flatMap((node) => node.parent === null ? [] : [node.parent]));
  const minimumY = nodes[0].position[1];
  const maximumY = Math.max(...nodes.map((node) => node.position[1]));
  const growthForY = (y: number) => 0.03 + ((y - minimumY) / (maximumY - minimumY)) * 0.94;

  nodes.forEach((node, nodeIndex) => {
    nodePositions.push(...node.position);
    nodeGrowth.push(growthForY(node.position[1]));
    nodeSeeds.push((nodeIndex * 0.61803398875) % 1);
    nodeTerminal.push(parentIndexes.has(nodeIndex) ? 0 : 1);

    if (node.parent === null) return;
    const parent = nodes[node.parent];
    const deltaX = node.position[0] - parent.position[0];
    const deltaY = node.position[1] - parent.position[1];
    const length = Math.max(0.001, Math.hypot(deltaX, deltaY));
    const edgeIndex = nodeIndex - 1;
    const direction = edgeIndex % 2 === 0 ? 1 : -1;
    const bend = (0.05 + (edgeIndex % 4) * 0.014) * direction;
    const control: Position3 = [
      (parent.position[0] + node.position[0]) * 0.5 - (deltaY / length) * bend,
      (parent.position[1] + node.position[1]) * 0.5 + (deltaX / length) * bend,
      (parent.position[2] + node.position[2]) * 0.5 + Math.sin(edgeIndex * 1.73) * 0.085,
    ];
    const parentGrowth = growthForY(parent.position[1]);
    const childGrowth = growthForY(node.position[1]);
    const seed = (edgeIndex * 0.754877666) % 1;

    for (let segment = 0; segment < ORGANIC_NETWORK_SEGMENTS_PER_EDGE; segment += 1) {
      const startT = segment / ORGANIC_NETWORK_SEGMENTS_PER_EDGE;
      const endT = (segment + 1) / ORGANIC_NETWORK_SEGMENTS_PER_EDGE;
      const start = sampleQuadratic(parent.position, control, node.position, startT);
      const end = sampleQuadratic(parent.position, control, node.position, endT);
      const startGrowth = parentGrowth + (childGrowth - parentGrowth) * startT;
      const endGrowth = parentGrowth + (childGrowth - parentGrowth) * endT;
      const tangentX = end[0] - start[0];
      const tangentY = end[1] - start[1];
      const tangentLength = Math.max(0.001, Math.hypot(tangentX, tangentY));
      const normalX = -tangentY / tangentLength;
      const normalY = tangentX / tangentLength;
      const startWidth = 0.019 - startGrowth * 0.008;
      const endWidth = 0.019 - endGrowth * 0.008;
      const startLeft: Position3 = [
        start[0] + normalX * startWidth,
        start[1] + normalY * startWidth,
        start[2],
      ];
      const startRight: Position3 = [
        start[0] - normalX * startWidth,
        start[1] - normalY * startWidth,
        start[2],
      ];
      const endLeft: Position3 = [
        end[0] + normalX * endWidth,
        end[1] + normalY * endWidth,
        end[2],
      ];
      const endRight: Position3 = [
        end[0] - normalX * endWidth,
        end[1] - normalY * endWidth,
        end[2],
      ];
      edgePositions.push(
        ...startLeft, ...startRight, ...endLeft,
        ...startRight, ...endRight, ...endLeft,
      );
      edgeGrowth.push(
        startGrowth, startGrowth, endGrowth,
        startGrowth, endGrowth, endGrowth,
      );
      edgeSeeds.push(seed, seed, seed, seed, seed, seed);
      edgeSides.push(-1, 1, -1, 1, 1, -1);
    }
  });

  return {
    edgeGrowth: new Float32Array(edgeGrowth),
    edgePositions: new Float32Array(edgePositions),
    edgeSeeds: new Float32Array(edgeSeeds),
    edgeSides: new Float32Array(edgeSides),
    nodeGrowth: new Float32Array(nodeGrowth),
    nodePositions: new Float32Array(nodePositions),
    nodeSeeds: new Float32Array(nodeSeeds),
    nodeTerminal: new Float32Array(nodeTerminal),
  };
}
