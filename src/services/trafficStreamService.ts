import type {
  GraphData,
  NetworkConnectionConfig,
  NodeType,
  TrafficPacket,
  TrafficStreamCallbacks,
  TrafficStreamHandle,
} from '../types/network';
import { createInitialGraphData } from './networkSimulator';
import {
  ensureNodeInGraph,
  pruneGhostLinks,
  upsertTrafficLink,
} from './graphConnectivity';

const PROTOCOLS = ['TCP', 'UDP', 'ICMP', 'HTTPS', 'DNS'];
const STATUSES = ['allowed', 'monitored', 'blocked', 'threat'] as const;

export function parseTrafficPayload(raw: unknown): TrafficPacket | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const sourceIp = String(data.sourceIp ?? data.source_ip ?? '');
  const destIp = String(data.destIp ?? data.dest_ip ?? data.destinationIp ?? '');
  if (!sourceIp || !destIp) return null;

  const isThreat = Boolean(data.isThreat ?? data.is_threat ?? data.threat);
  const statusRaw = String(data.status ?? (isThreat ? 'threat' : 'allowed'));
  const status = STATUSES.includes(statusRaw as (typeof STATUSES)[number])
    ? (statusRaw as TrafficPacket['status'])
    : isThreat
      ? 'threat'
      : 'allowed';

  const sourcePort = data.sourcePort ?? data.source_port;
  const destPort = data.destPort ?? data.dest_port;

  return {
    id: data.id ? String(data.id) : crypto.randomUUID(),
    sourceIp,
    destIp,
    protocol: String(data.protocol ?? 'TCP'),
    status,
    isThreat,
    threatLevel: Number(data.threatLevel ?? data.threat_level ?? (isThreat ? 8 : 1)),
    timestamp: data.timestamp ? new Date(String(data.timestamp)) : new Date(),
    sourcePort: sourcePort != null ? Number(sourcePort) : undefined,
    destPort: destPort != null ? Number(destPort) : undefined,
  };
}

function resolveWebSocketUrl(endpointUrl: string): string {
  const trimmed = endpointUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
    return trimmed;
  }

  const url = new URL(
    trimmed.startsWith('http') ? trimmed : `http://${trimmed}`
  );
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  const base = `${protocol}//${url.host}`;
  const path = url.pathname.endsWith('/')
    ? `${url.pathname}ws/traffic`
    : `${url.pathname}/ws/traffic`.replace('//', '/');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function createMockTrafficStream(
  callbacks: TrafficStreamCallbacks
): TrafficStreamHandle {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const knownIps = [
    '192.168.1.10',
    '192.168.1.22',
    '192.168.1.45',
    '10.0.0.8',
    '10.0.0.15',
    '172.16.0.3',
  ];

  callbacks.onStatusChange('connected', 'Demo traffic stream active');

  timer = setInterval(() => {
    if (stopped) return;

    const sourceIp =
      Math.random() > 0.35
        ? knownIps[Math.floor(Math.random() * knownIps.length)]
        : `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;

    let destIp =
      Math.random() > 0.5
        ? '127.0.0.1'
        : knownIps[Math.floor(Math.random() * knownIps.length)];

    if (sourceIp === destIp) {
      destIp = '127.0.0.1';
    }

    const isThreat = Math.random() > 0.88;
    const suspiciousPorts = [22, 3389, 445, 4444, 8080];
    const sourcePort = isThreat
      ? suspiciousPorts[Math.floor(Math.random() * suspiciousPorts.length)]
      : [80, 443, 5353][Math.floor(Math.random() * 3)];
    const destPort = isThreat
      ? [22, 3389, 445][Math.floor(Math.random() * 3)]
      : [80, 443][Math.floor(Math.random() * 2)];

    callbacks.onPacket({
      id: crypto.randomUUID(),
      sourceIp,
      destIp,
      protocol: PROTOCOLS[Math.floor(Math.random() * PROTOCOLS.length)],
      status: isThreat ? 'threat' : Math.random() > 0.9 ? 'blocked' : 'allowed',
      isThreat,
      threatLevel: isThreat ? Math.floor(Math.random() * 3) + 8 : 1,
      timestamp: new Date(),
      sourcePort,
      destPort,
    });
  }, 700);

  return {
    disconnect() {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}

export function connectTrafficStream(
  config: NetworkConnectionConfig,
  callbacks: TrafficStreamCallbacks
): TrafficStreamHandle {
  const url = config.endpointUrl.trim();

  if (!url) {
    return createMockTrafficStream(callbacks);
  }

  callbacks.onStatusChange('connecting', 'Establishing stream…');

  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const wsUrl = resolveWebSocketUrl(url);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (stopped) return;
      callbacks.onStatusChange('connected', `Connected to ${wsUrl}`);
    };

    ws.onmessage = (event) => {
      if (stopped) return;
      try {
        const payload = JSON.parse(event.data as string);
        const packets = Array.isArray(payload) ? payload : [payload];
        packets.forEach((item) => {
          const packet = parseTrafficPayload(item);
          if (packet) callbacks.onPacket(packet);
        });
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onerror = () => {
      if (stopped) return;
      callbacks.onStatusChange('error', 'WebSocket connection failed');
    };

    ws.onclose = () => {
      if (stopped) return;
      callbacks.onStatusChange('disconnected', 'Stream closed');
    };
  } catch {
    callbacks.onStatusChange('error', 'Invalid endpoint URL');
  }

  const httpUrl = url.startsWith('http') ? url : `http://${url}`;
  pollTimer = setInterval(async () => {
    if (stopped || ws?.readyState === WebSocket.OPEN) return;
    try {
      const res = await fetch(`${httpUrl.replace(/\/$/, '')}/api/traffic`);
      if (!res.ok) return;
      const data = await res.json();
      const packets = Array.isArray(data) ? data : [data];
      packets.forEach((item) => {
        const packet = parseTrafficPayload(item);
        if (packet) callbacks.onPacket(packet);
      });
      callbacks.onStatusChange('connected', 'Polling REST /api/traffic');
    } catch {
      if (!stopped) {
        callbacks.onStatusChange(
          'error',
          'Unable to reach endpoint (WebSocket or REST)'
        );
      }
    }
  }, 2000);

  return {
    disconnect() {
      stopped = true;
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}

export function applyTrafficPacketToGraph(
  graph: GraphData,
  packet: TrafficPacket
): GraphData {
  const nodeType: NodeType = packet.isThreat ? 'intruder' : 'trusted';
  const threatLevel = packet.threatLevel ?? (packet.isThreat ? 8 : 2);

  const { graph: withSource, nodeId: sourceId } = ensureNodeInGraph(
    graph,
    packet.sourceIp,
    nodeType,
    threatLevel
  );
  const { graph: withBoth, nodeId: targetId } = ensureNodeInGraph(
    withSource,
    packet.destIp,
    packet.isThreat ? 'intruder' : 'trusted',
    threatLevel
  );

  if (sourceId === targetId) {
    return withBoth;
  }

  return upsertTrafficLink(withBoth, sourceId, targetId, {
    threatLevel,
    nodeType: packet.isThreat ? 'intruder' : 'trusted',
    protocol: packet.protocol,
    isAttackLink: packet.isThreat,
    intensityBoost: 0.18,
  });
}

export function decayLinkTraffic(graph: GraphData): GraphData {
  const links = graph.links
    .map((l) => ({
      ...l,
      trafficIntensity: Math.max(0, (l.trafficIntensity ?? 0.08) * 0.94),
    }))
    .filter((l) => (l.trafficIntensity ?? 0) > 0.04 || (l.packetCount ?? 0) > 0);

  return pruneGhostLinks({ ...graph, links });
}

export { createInitialGraphData };
