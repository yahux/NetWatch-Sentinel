export type NodeType = 'center' | 'trusted' | 'intruder';

export type DeviceStatus = 'active' | 'blocked' | 'ignored';

export type TrafficMode = 'monitor' | 'intrusion';

/** Continuous Flow shows all traffic; Silent Alert only surfaces threat signatures. */
export type MonitoringMode = 'continuous' | 'silent_alert';

export type DataSourceMode = 'simulated' | 'live';

export type ThreatLevelTier = 'secure' | 'caution' | 'critical';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type TrafficStatus = 'allowed' | 'blocked' | 'threat' | 'monitored';

export interface NetworkDevice {
  id: string;
  ip: string;
  hostname: string;
  nodeType: NodeType;
  threatLevel: number;
  timestamp: Date;
  status: DeviceStatus;
  macAddress: string;
  protocol: string;
  port: number;
}

export interface GraphNode {
  id: string;
  label: string;
  name?: string;
  status?: DeviceStatus;
  ip?: string;
  hostname?: string;
  nodeType: NodeType;
  threatLevel?: number;
  isCenter?: boolean;
  x?: number;
  y?: number;
  z?: number;
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  threatLevel: number;
  nodeType: NodeType;
  isAttackLink?: boolean;
  /** 0–1 visual weight; decays over time */
  trafficIntensity?: number;
  packetCount?: number;
  protocol?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface TrafficPacket {
  id?: string;
  sourceIp: string;
  destIp: string;
  protocol: string;
  status: TrafficStatus;
  isThreat: boolean;
  threatLevel?: number;
  timestamp?: Date;
  sourcePort?: number;
  destPort?: number;
}

export interface TrafficLogEntry {
  id: string;
  sourceIp: string;
  destIp: string;
  protocol: string;
  status: TrafficStatus;
  timestamp: Date;
  isThreat: boolean;
  signatures?: string[];
  sourcePort?: number;
  destPort?: number;
}

export interface NetworkConnectionConfig {
  endpointUrl: string;
  targetIp: string;
  serviceName: string;
  monitoringMode: MonitoringMode;
  /** @deprecated Use monitoringMode */
  trafficMode?: TrafficMode;
}

export interface ForensicSessionMeta {
  targetIp: string;
  serviceName: string;
  monitoringMode: MonitoringMode;
  dataSourceMode: DataSourceMode;
  startedAt: string;
  isRecording: boolean;
}

export interface TelemetrySnapshot {
  exportedAt: string;
  session: ForensicSessionMeta;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  threatGauge: {
    tier: ThreatLevelTier;
    label: string;
    ratio: number;
    intruderCount: number;
    trustedCount: number;
  };
  packetThroughput: number;
  backgroundPacketCount: number;
  nodeCount: number;
  graph: {
    nodeCount: number;
    linkCount: number;
    intruderNodes: number;
    trustedNodes: number;
  };
  trafficLogs: Array<Omit<TrafficLogEntry, 'timestamp'> & { timestamp: string }>;
  sessionThreatLogs: Array<Omit<TrafficLogEntry, 'timestamp'> & { timestamp: string }>;
  intruderAlerts: Array<Omit<IntruderAlert, 'timestamp'> & { timestamp: string }>;
}

export interface ForensicVideoFrame {
  frameIndex: number;
  timestamp: string;
  trigger: string;
  nodeCount: number;
  linkCount: number;
  nodes: Array<{
    id: string;
    ip: string;
    nodeType: NodeType;
    x?: number;
    y?: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    isAttackLink: boolean;
    trafficIntensity: number;
  }>;
}

export interface IntruderAlert {
  id: string;
  message: string;
  sourceIp: string;
  destIp: string;
  signatures: string[];
  timestamp: Date;
  dismissed: boolean;
}

export interface NetworkState {
  devices: NetworkDevice[];
  graphData: GraphData;
  trafficLogs: TrafficLogEntry[];
  sessionThreatLogs: TrafficLogEntry[];
  selectedDeviceId: string | null;
  isMonitoring: boolean;
  packetThroughput: number;
  lastUpdated: Date | null;
  connectionConfig: NetworkConnectionConfig | null;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  monitoringMode: MonitoringMode;
  /** @deprecated Use monitoringMode */
  trafficMode: TrafficMode;
  isRecordingSession: boolean;
  intruderAlerts: IntruderAlert[];
  videoExportFrames: ForensicVideoFrame[];
  backgroundPacketCount: number;
  dataSourceMode: DataSourceMode;
}

export interface NetworkDataSource {
  start(callbacks: NetworkSimulatorCallbacks): () => void;
  fetchHistory?(): Promise<NetworkDevice[]>;
}

export interface NetworkSimulatorCallbacks {
  onDevice: (device: NetworkDevice) => void;
}

export interface TrafficStreamCallbacks {
  onPacket: (packet: TrafficPacket) => void;
  onStatusChange: (status: ConnectionStatus, message?: string) => void;
}

export interface TrafficStreamHandle {
  disconnect: () => void;
}

export interface GraphCaptureHandle {
  captureSnapshot: (scale?: number) => string | null;
}

/** @deprecated Use TrafficLogEntry */
export interface SecurityEvent {
  id: string;
  deviceId: string;
  ip: string;
  hostname: string;
  threatLevel: number;
  timestamp: Date;
  dismissed: boolean;
}
