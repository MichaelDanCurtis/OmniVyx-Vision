import { describe, expect, it } from 'vitest';
import {
  createOrganicNetworkGeometry,
  organicBranchWidth,
  ORGANIC_NETWORK_EDGE_COUNT,
  ORGANIC_NETWORK_NODE_COUNT,
  ORGANIC_NETWORK_SEGMENTS_PER_EDGE,
  ORGANIC_NETWORK_VERTICES_PER_SEGMENT,
} from './organicNetwork';

describe('organicNetwork', () => {
  it('builds a deterministic curved tree in two renderable geometry sets', () => {
    const first = createOrganicNetworkGeometry();
    const second = createOrganicNetworkGeometry();
    const edgeVertexCount = ORGANIC_NETWORK_EDGE_COUNT
      * ORGANIC_NETWORK_SEGMENTS_PER_EDGE
      * ORGANIC_NETWORK_VERTICES_PER_SEGMENT;

    expect(first.edgePositions).toHaveLength(edgeVertexCount * 3);
    expect(first.edgeGrowth).toHaveLength(edgeVertexCount);
    expect(first.edgeSeeds).toHaveLength(edgeVertexCount);
    expect(first.edgeSides).toHaveLength(edgeVertexCount);
    expect(first.nodePositions).toHaveLength(ORGANIC_NETWORK_NODE_COUNT * 3);
    expect(first.nodeGrowth).toHaveLength(ORGANIC_NETWORK_NODE_COUNT);
    expect(first.nodeSeeds).toHaveLength(ORGANIC_NETWORK_NODE_COUNT);
    expect(first.nodeTerminal).toHaveLength(ORGANIC_NETWORK_NODE_COUNT);
    expect(ORGANIC_NETWORK_NODE_COUNT).toBeGreaterThan(50);
    expect(ORGANIC_NETWORK_EDGE_COUNT).toBe(ORGANIC_NETWORK_NODE_COUNT - 1);
    expect([...first.edgePositions]).toEqual([...second.edgePositions]);
  });

  it('keeps growth monotonic and reserves terminal emphasis for branch tips', () => {
    const geometry = createOrganicNetworkGeometry();

    for (let vertex = 0; vertex < geometry.edgeGrowth.length; vertex += ORGANIC_NETWORK_VERTICES_PER_SEGMENT) {
      expect(geometry.edgeGrowth[vertex]).toBeLessThanOrEqual(
        geometry.edgeGrowth[vertex + ORGANIC_NETWORK_VERTICES_PER_SEGMENT - 1],
      );
    }
    expect([...geometry.edgeGrowth].every((value) => value >= 0 && value <= 1)).toBe(true);
    expect([...geometry.nodeTerminal].filter((value) => value === 1).length).toBeGreaterThan(10);
    const nodeDepths = Array.from(
      { length: geometry.nodePositions.length / 3 },
      (_, index) => geometry.nodePositions[index * 3 + 2],
    );
    expect(Math.max(...nodeDepths) - Math.min(...nodeDepths)).toBeGreaterThan(0.3);
    expect([
      ...geometry.edgePositions,
      ...geometry.edgeGrowth,
      ...geometry.edgeSeeds,
      ...geometry.edgeSides,
      ...geometry.nodePositions,
      ...geometry.nodeGrowth,
      ...geometry.nodeSeeds,
      ...geometry.nodeTerminal,
    ].every(Number.isFinite)).toBe(true);
  });

  it('tapers the living structure from a substantial root to fine tips', () => {
    expect(organicBranchWidth(0)).toBeCloseTo(0.046, 8);
    expect(organicBranchWidth(1)).toBeCloseTo(0.021, 8);
    expect(organicBranchWidth(0.2)).toBeGreaterThan(organicBranchWidth(0.8));
    expect(() => organicBranchWidth(-0.1)).toThrow(/between zero and one/);
    expect(() => organicBranchWidth(Number.NaN)).toThrow(/finite/);
  });
});
