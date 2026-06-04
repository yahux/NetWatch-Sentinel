import type {
  DeviceStatus,
  GraphData,
  GraphLink,
  GraphNode,
  NetworkDevice,
} from '../types/network';
import { CENTER_NODE_ID, createCenterNode } from './networkSimulator';

export interface DummyNodeSpec {
  id: string;
  name: string;
  status: DeviceStatus;
  ip: string;
  x: number;
  y: number;
  nodeType: 'trusted' | 'intruder';
  threatLevel: number;
}

const DUMMY_NODE_SPECS: DummyNodeSpec[] = [
  {
    id: 'debug-node-1',
    name: 'Node 1',
    status: 'active',
    ip: '10.0.0.1',
    x: 140,
    y: -90,
    nodeType: 'trusted',
    threatLevel: 2,
  },
  {
    id: 'debug-node-2',
    name: 'Node 2',
    status: 'active',
    ip: '10.0.0.2',
    x: 220,
    y: 30,
    nodeType: 'trusted',
    threatLevel: 2,
  },
  {
    id: 'debug-node-3',
    name: 'Node 3',
    status: 'active',
    ip: '10.0.0.3',
    x: 60,
    y: 130,
    nodeType: 'trusted',
    threatLevel: 3,
  },
  {
    id: 'debug-node-4',
    name: 'Node 4',
    status: 'blocked',
    ip: '10.0.0.4',
    x: -110,
    y: 110,
    nodeType: 'trusted',
    threatLevel: 4,
  },
  {
    id: 'debug-node-5',
    name: 'Node 5',
    status: 'active',
    ip: '10.0.0.5',
    x: -190,
    y: -30,
    nodeType: 'intruder',
    threatLevel: 9,
  },
];

const DUMMY_LINK_SPECS: Array<{ source: string; target: string }> = [
  { source: 'debug-node-1', target: 'debug-node-2' },
  { source: 'debug-node-2', target: 'debug-node-3' },
  { source: 'debug-node-3', target: 'debug-node-4' },
  { source: 'debug-node-4', target: 'debug-node-5' },
  { source: 'debug-node-3', target: CENTER_NODE_ID },
];

function specToGraphNode(spec: DummyNodeSpec): GraphNode {
  return {
    id: spec.id,
    label: spec.name,
    name: spec.name,
    status: spec.status,
    ip: spec.ip,
    hostname: spec.name.toLowerCase().replace(/\s+/g, '-'),
    nodeType: spec.nodeType,
    threatLevel: spec.threatLevel,
    x: spec.x,
    y: spec.y,
  };
}

function specToDevice(spec: DummyNodeSpec): NetworkDevice {
  return {
    id: spec.id,
    ip: spec.ip,
    hostname: spec.name.toLowerCase().replace(/\s+/g, '-'),
    nodeType: spec.nodeType,
    threatLevel: spec.threatLevel,
    timestamp: new Date(),
    status: spec.status,
    macAddress: 'DE:AD:BE:EF:00:00',
    protocol: 'TCP',
    port: 443,
  };
}

function specToLink(
  source: string,
  target: string,
  specs: DummyNodeSpec[]
): GraphLink {
  const sourceSpec = specs.find((s) => s.id === source);
  const nodeType = sourceSpec?.nodeType ?? 'trusted';
  return {
    source,
    target,
    threatLevel: sourceSpec?.threatLevel ?? 2,
    nodeType,
  };
}

export interface DummyGraphPayload {
  graphData: GraphData;
  devices: NetworkDevice[];
}

/** Temporary debug helper — populates 5 chained dummy nodes for layout/interaction testing. */
export function generateDummyGraphData(
  existingGraph: GraphData = { nodes: [createCenterNode()], links: [] }
): DummyGraphPayload {
  const existingIds = new Set(existingGraph.nodes.map((n) => n.id));

  const newNodes = DUMMY_NODE_SPECS.filter(
    (spec) => !existingIds.has(spec.id)
  ).map(specToGraphNode);

  const allNodeIds = new Set([
    ...existingGraph.nodes.map((n) => n.id),
    ...newNodes.map((n) => n.id),
  ]);

  const existingLinkKeys = new Set(
    existingGraph.links.map((l) => {
      const s = typeof l.source === 'string' ? l.source : l.source;
      const t = typeof l.target === 'string' ? l.target : l.target;
      return `${s}->${t}`;
    })
  );

  const newLinks = DUMMY_LINK_SPECS.filter(
    ({ source, target }) =>
      allNodeIds.has(source) &&
      allNodeIds.has(target) &&
      !existingLinkKeys.has(`${source}->${target}`)
  ).map(({ source, target }) => specToLink(source, target, DUMMY_NODE_SPECS));

  const centerNode =
    existingGraph.nodes.find((n) => n.isCenter) ?? createCenterNode();

  const devices = DUMMY_NODE_SPECS.filter(
    (spec) => !existingIds.has(spec.id)
  ).map(specToDevice);

  return {
    graphData: {
      nodes: [
        centerNode,
        ...existingGraph.nodes.filter((n) => !n.isCenter),
        ...newNodes,
      ],
      links: [...existingGraph.links, ...newLinks],
    },
    devices,
  };
}

export { DUMMY_NODE_SPECS };
