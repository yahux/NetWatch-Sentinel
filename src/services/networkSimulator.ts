import type {
  NetworkDataSource,
  NetworkDevice,
  NetworkSimulatorCallbacks,
  NodeType,
} from '../types/network';

const CENTER_NODE_ID = 'local-server';

const TRUSTED_HOSTNAMES = [
  'workstation-',
  'printer-',
  'nas-storage-',
  'iot-sensor-',
  'cam-node-',
];

const INTRUDER_HOSTNAMES = [
  'unknown-host',
  'proxy-exit',
  'scan-bot',
  'brute-force',
  'exploit-kit',
];

function randomIp(): string {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

function randomMac(): string {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function pickHostname(prefixes: string[]): string {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}${Math.floor(Math.random() * 900 + 100)}`;
}

function createDevice(nodeType: Exclude<NodeType, 'center'>): NetworkDevice {
  const isIntruder = nodeType === 'intruder';
  return {
    id: crypto.randomUUID(),
    ip: randomIp(),
    hostname: pickHostname(isIntruder ? INTRUDER_HOSTNAMES : TRUSTED_HOSTNAMES),
    nodeType,
    threatLevel: isIntruder
      ? Math.floor(Math.random() * 3) + 8
      : Math.floor(Math.random() * 3) + 1,
    timestamp: new Date(),
    status: 'active',
    macAddress: randomMac(),
    protocol: isIntruder
      ? ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)]
      : 'TCP',
    port: isIntruder
      ? [22, 443, 8080, 3389][Math.floor(Math.random() * 4)]
      : [80, 443, 5353][Math.floor(Math.random() * 3)],
  };
}

export function createSimulatedDevice(
  nodeType: Exclude<NodeType, 'center'>
): NetworkDevice {
  return createDevice(nodeType);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export interface SimulatorOptions {
  trustedIntervalMs?: number;
  intruderMinMs?: number;
  intruderMaxMs?: number;
}

/**
 * Mock network simulator — adds trusted nodes on a fixed cadence and
 * injects intruders at random intervals for alert testing.
 */
export function createNetworkSimulator(
  options: SimulatorOptions = {}
): NetworkDataSource {
  const {
    trustedIntervalMs = 2800,
    intruderMinMs = 7000,
    intruderMaxMs = 18000,
  } = options;

  return {
    start(callbacks: NetworkSimulatorCallbacks) {
      let intruderTimer: ReturnType<typeof setTimeout> | null = null;
      let trustedTimer: ReturnType<typeof setInterval> | null = null;
      let stopped = false;

      const emit = (nodeType: Exclude<NodeType, 'center'>) => {
        if (stopped) return;
        callbacks.onDevice(createDevice(nodeType));
      };

      const scheduleIntruder = () => {
        if (stopped) return;
        const delay = randomBetween(intruderMinMs, intruderMaxMs);
        intruderTimer = setTimeout(() => {
          emit('intruder');
          scheduleIntruder();
        }, delay);
      };

      trustedTimer = setInterval(() => emit('trusted'), trustedIntervalMs);
      scheduleIntruder();

      return () => {
        stopped = true;
        if (trustedTimer) clearInterval(trustedTimer);
        if (intruderTimer) clearTimeout(intruderTimer);
      };
    },
  };
}

function spawnPosition(): { x: number; y: number } {
  const angle = Math.random() * Math.PI * 2;
  const radius = 160 + Math.random() * 140;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function createCenterNode() {
  return {
    id: CENTER_NODE_ID,
    label: 'Local Server',
    nodeType: 'center' as const,
    isCenter: true,
    fx: 0,
    fy: 0,
  };
}

export function createInitialGraphData() {
  return { nodes: [createCenterNode()], links: [] };
}

export function deviceToGraphElements(device: NetworkDevice) {
  const pos = spawnPosition();
  const node = {
    id: device.id,
    label: device.ip,
    ip: device.ip,
    hostname: device.hostname,
    nodeType: device.nodeType,
    threatLevel: device.threatLevel,
    x: pos.x,
    y: pos.y,
  };

  const link = {
    source: CENTER_NODE_ID,
    target: device.id,
    threatLevel: device.threatLevel,
    nodeType: device.nodeType,
    trafficIntensity: 0.2,
    packetCount: 0,
  };

  return { node, link };
}

export function createSecurityEvent(device: NetworkDevice) {
  return {
    id: crypto.randomUUID(),
    deviceId: device.id,
    ip: device.ip,
    hostname: device.hostname,
    threatLevel: device.threatLevel,
    timestamp: device.timestamp,
    dismissed: false,
  };
}

export { CENTER_NODE_ID };
