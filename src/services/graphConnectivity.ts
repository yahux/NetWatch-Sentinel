import type {
  GraphData,
  GraphLink,
  GraphNode,
  NetworkDevice,
  NodeType,
} from '../types/network';
import {
  CENTER_NODE_ID,
  createCenterNode,
  deviceToGraphElements,
} from './networkSimulator';

const LOCAL_IPS = new Set([
  '127.0.0.1',
  '0.0.0.0',
  'localhost',
  'local-server',
  '::1',
]);

function hashIp(ip: string): number {
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = (h << 5) - h + ip.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function spawnPositionForIp(ip: string): { x: number; y: number } {
  const h = hashIp(ip);
  const angle = (h % 360) * (Math.PI / 180);
  const radius = 140 + (h % 120);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function ipToNodeId(ip: string): string {
  const normalized = ip.trim().toLowerCase();
  if (LOCAL_IPS.has(normalized)) return CENTER_NODE_ID;
  return `ip:${normalized}`;
}

export function createNodeFromIp(
  ip: string,
  nodeType: NodeType,
  threatLevel = 2
): GraphNode {
  if (ipToNodeId(ip) === CENTER_NODE_ID) {
    return createCenterNode();
  }
  const pos = spawnPositionForIp(ip);
  return {
    id: ipToNodeId(ip),
    label: ip,
    ip,
    name: ip,
    nodeType,
    threatLevel,
    x: pos.x,
    y: pos.y,
  };
}

export function getLinkEndpoints(link: GraphLink): {
  sourceId: string;
  targetId: string;
} {
  const sourceId =
    typeof link.source === 'string'
      ? link.source
      : (link.source as { id: string }).id;
  const targetId =
    typeof link.target === 'string'
      ? link.target
      : (link.target as { id: string }).id;
  return { sourceId, targetId };
}

export function getLinkKey(sourceId: string, targetId: string): string {
  return `${sourceId}->${targetId}`;
}

export function resolveNodeIdForIp(graph: GraphData, ip: string): string {
  const normalized = ip.trim();
  const existing = graph.nodes.find(
    (n) => n.ip === normalized || n.label === normalized
  );
  if (existing) return existing.id;
  return ipToNodeId(normalized);
}

export function createCenterToNodeLink(
  nodeId: string,
  nodeType: NodeType,
  threatLevel: number,
  overrides?: Partial<GraphLink>
): GraphLink {
  return {
    source: CENTER_NODE_ID,
    target: nodeId,
    threatLevel,
    nodeType,
    trafficIntensity: 0.2,
    packetCount: 0,
    ...overrides,
  };
}

export function ensureCenterLink(
  links: GraphLink[],
  nodeId: string,
  nodeType: NodeType,
  threatLevel: number
): GraphLink[] {
  if (nodeId === CENTER_NODE_ID) return links;

  const key = getLinkKey(CENTER_NODE_ID, nodeId);
  const exists = links.some((l) => {
    const { sourceId, targetId } = getLinkEndpoints(l);
    return getLinkKey(sourceId, targetId) === key;
  });

  if (exists) return links;

  return [...links, createCenterToNodeLink(nodeId, nodeType, threatLevel)];
}

export function pruneGhostLinks(graph: GraphData): GraphData {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const links = graph.links.filter((l) => {
    const { sourceId, targetId } = getLinkEndpoints(l);
    return nodeIds.has(sourceId) && nodeIds.has(targetId);
  });
  return { ...graph, links };
}

export function removeNodesFromGraph(
  graph: GraphData,
  removedIds: Set<string>
): GraphData {
  if (removedIds.size === 0) return graph;

  const nodes = graph.nodes.filter((n) => !removedIds.has(n.id));
  const links = graph.links.filter((l) => {
    const { sourceId, targetId } = getLinkEndpoints(l);
    return !removedIds.has(sourceId) && !removedIds.has(targetId);
  });

  return pruneGhostLinks({ nodes, links });
}

export function appendDeviceToGraph(
  graph: GraphData,
  device: NetworkDevice
): GraphData {
  if (graph.nodes.some((n) => n.id === device.id)) {
    const links = ensureCenterLink(
      graph.links,
      device.id,
      device.nodeType,
      device.threatLevel
    );
    return pruneGhostLinks({ ...graph, links });
  }

  const { node, link } = deviceToGraphElements(device);
  const nodes = [...graph.nodes, node];
  let links = [...graph.links, link];
  links = ensureCenterLink(links, device.id, device.nodeType, device.threatLevel);

  return pruneGhostLinks({ nodes, links });
}

export function ensureNodeInGraph(
  graph: GraphData,
  ip: string,
  nodeType: NodeType,
  threatLevel: number
): { graph: GraphData; nodeId: string } {
  let nodes = [...graph.nodes];
  if (!nodes.some((n) => n.id === CENTER_NODE_ID)) {
    nodes.unshift(createCenterNode());
  }

  const nodeId = resolveNodeIdForIp({ nodes, links: graph.links }, ip);
  let links = [...graph.links];

  if (!nodes.some((n) => n.id === nodeId)) {
    if (nodeId === CENTER_NODE_ID) {
      nodes = [createCenterNode(), ...nodes.filter((n) => n.id !== CENTER_NODE_ID)];
    } else {
      nodes.push(createNodeFromIp(ip, nodeType, threatLevel));
    }
  } else {
    nodes = nodes.map((n) =>
      n.id === nodeId && nodeType === 'intruder' && n.nodeType !== 'center'
        ? { ...n, nodeType: 'intruder' as const, threatLevel }
        : n
    );
  }

  if (nodeId !== CENTER_NODE_ID) {
    links = ensureCenterLink(links, nodeId, nodeType, threatLevel);
  }

  return {
    graph: pruneGhostLinks({ nodes, links }),
    nodeId,
  };
}

export function upsertTrafficLink(
  graph: GraphData,
  sourceId: string,
  targetId: string,
  options: {
    threatLevel: number;
    nodeType: NodeType;
    protocol?: string;
    isAttackLink?: boolean;
    intensityBoost?: number;
  }
): GraphData {
  const linkKey = getLinkKey(sourceId, targetId);
  const links = [...graph.links];
  const idx = links.findIndex((l) => {
    const { sourceId: s, targetId: t } = getLinkEndpoints(l);
    return getLinkKey(s, t) === linkKey;
  });

  const boost = options.intensityBoost ?? 0.18;

  if (idx >= 0) {
    const existing = links[idx];
    links[idx] = {
      ...existing,
      trafficIntensity: Math.min(
        1,
        (existing.trafficIntensity ?? 0.15) + boost
      ),
      packetCount: (existing.packetCount ?? 0) + 1,
      protocol: options.protocol ?? existing.protocol,
      threatLevel: Math.max(existing.threatLevel, options.threatLevel),
      nodeType: options.isAttackLink ? 'intruder' : existing.nodeType,
      isAttackLink: options.isAttackLink || existing.isAttackLink,
    };
  } else {
    links.push({
      source: sourceId,
      target: targetId,
      threatLevel: options.threatLevel,
      nodeType: options.nodeType,
      trafficIntensity: 0.35,
      packetCount: 1,
      protocol: options.protocol,
      isAttackLink: options.isAttackLink,
    });
  }

  return pruneGhostLinks({ ...graph, links });
}

export function createAttackLinkBetween(
  graph: GraphData,
  intruderNodeId: string,
  targetNodeId: string,
  protocol = 'TCP'
): GraphData {
  if (intruderNodeId === targetNodeId) return graph;

  const targetNode = graph.nodes.find((n) => n.id === targetNodeId);
  if (!targetNode) return graph;

  let result = upsertTrafficLink(graph, intruderNodeId, targetNodeId, {
    threatLevel: 10,
    nodeType: 'intruder',
    protocol,
    isAttackLink: true,
    intensityBoost: 0.25,
  });

  let links = ensureCenterLink(result.links, intruderNodeId, 'intruder', 10);
  links = ensureCenterLink(
    links,
    targetNodeId,
    targetNode.nodeType,
    targetNode.threatLevel ?? 2
  );

  return pruneGhostLinks({ ...result, links });
}
