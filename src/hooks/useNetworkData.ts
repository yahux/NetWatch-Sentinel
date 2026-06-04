import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  appendDeviceToGraph,
  createAttackLinkBetween,
  pruneGhostLinks,
  removeNodesFromGraph,
} from '../services/graphConnectivity';
import {
  createInitialGraphData,
  createSimulatedDevice,
} from '../services/networkSimulator';
import {
  createVideoExportFrame,
  downloadGraphSnapshot,
  exportTelemetryJson,
  exportThreatLogsJson,
  exportThreatLogsText,
  exportVideoExportManifest,
} from '../services/forensicRecorder';
import { evaluateThreatSignature } from '../services/threatSignature';
import { isValidTargetAddress } from '../utils/targetValidation';
import { computeThreatLevel } from '../utils/threatLevel';
import {
  applyTrafficPacketToGraph,
  connectTrafficStream,
  decayLinkTraffic,
} from '../services/trafficStreamService';
import type {
  DataSourceMode,
  ForensicSessionMeta,
  GraphCaptureHandle,
  GraphData,
  IntruderAlert,
  MonitoringMode,
  NetworkConnectionConfig,
  NetworkDevice,
  NetworkState,
  TrafficLogEntry,
  TrafficPacket,
} from '../types/network';

const MAX_DEVICES = 80;
const MAX_LOGS = 60;
const MAX_ALERTS = 8;
const SAFE_NODE_BATCH = 4;

function monitoringModeToLegacy(mode: MonitoringMode): 'monitor' | 'intrusion' {
  return mode === 'silent_alert' ? 'intrusion' : 'monitor';
}

function packetToLog(
  packet: TrafficPacket,
  signatures?: string[]
): TrafficLogEntry {
  return {
    id: packet.id ?? crypto.randomUUID(),
    sourceIp: packet.sourceIp,
    destIp: packet.destIp,
    protocol: packet.protocol,
    status: packet.status,
    timestamp: packet.timestamp ?? new Date(),
    isThreat: packet.isThreat,
    signatures,
    sourcePort: packet.sourcePort,
    destPort: packet.destPort,
  };
}

function buildSessionMeta(
  config: NetworkConnectionConfig | null,
  isRecording: boolean,
  dataSourceMode: DataSourceMode
): ForensicSessionMeta {
  return {
    targetIp: config?.targetIp ?? '',
    serviceName: config?.serviceName ?? '',
    monitoringMode: config?.monitoringMode ?? 'continuous',
    dataSourceMode,
    startedAt: new Date().toISOString(),
    isRecording,
  };
}

export function useNetworkData(
  graphCaptureRef?: React.RefObject<GraphCaptureHandle | null>
) {
  const [state, setState] = useState<NetworkState>({
    devices: [],
    graphData: createInitialGraphData(),
    trafficLogs: [],
    sessionThreatLogs: [],
    selectedDeviceId: null,
    isMonitoring: false,
    packetThroughput: 0,
    lastUpdated: null,
    connectionConfig: null,
    connectionStatus: 'disconnected',
    connectionMessage: 'Configure a network endpoint to begin',
    monitoringMode: 'continuous',
    trafficMode: 'monitor',
    isRecordingSession: false,
    intruderAlerts: [],
    videoExportFrames: [],
    backgroundPacketCount: 0,
    dataSourceMode: 'simulated',
  });

  const graphRef = useRef<GraphData>(state.graphData);
  graphRef.current = state.graphData;
  const streamRef = useRef<{ disconnect: () => void } | null>(null);
  const monitoringModeRef = useRef<MonitoringMode>(state.monitoringMode);
  monitoringModeRef.current = state.monitoringMode;
  const isRecordingRef = useRef(state.isRecordingSession);
  isRecordingRef.current = state.isRecordingSession;
  const packetCountRef = useRef(0);
  const backgroundCountRef = useRef(0);

  const triggerCapture = useCallback((label: string, scale = 2) => {
    const dataUrl = graphCaptureRef?.current?.captureSnapshot(scale) ?? null;
    if (dataUrl) {
      downloadGraphSnapshot(dataUrl, label);
    }
  }, [graphCaptureRef]);

  const processTrafficPacket = useCallback(
    (packet: TrafficPacket) => {
      backgroundCountRef.current += 1;
      const graphData = applyTrafficPacketToGraph(graphRef.current, packet);
      graphRef.current = graphData;

      const { matches, signatures } = evaluateThreatSignature(packet);
      const silent = monitoringModeRef.current === 'silent_alert';

      if (silent && !matches) {
        setState((prev) => ({
          ...prev,
          backgroundPacketCount: backgroundCountRef.current,
        }));
        return;
      }

      packetCountRef.current += 1;
      const log = packetToLog(packet, matches ? signatures : undefined);

      setState((prev) => {
        const trafficLogs = [log, ...prev.trafficLogs].slice(0, MAX_LOGS);
        let intruderAlerts = prev.intruderAlerts;
        let sessionThreatLogs = prev.sessionThreatLogs;
        let videoExportFrames = prev.videoExportFrames;

        if (matches) {
          const alert: IntruderAlert = {
            id: crypto.randomUUID(),
            message: `Threat signature: ${signatures.join(', ')}`,
            sourceIp: packet.sourceIp,
            destIp: packet.destIp,
            signatures,
            timestamp: log.timestamp,
            dismissed: false,
          };
          intruderAlerts = [alert, ...intruderAlerts].slice(0, MAX_ALERTS);

          if (prev.isRecordingSession) {
            sessionThreatLogs = [log, ...sessionThreatLogs];
            videoExportFrames = [
              ...videoExportFrames,
              createVideoExportFrame(graphData, 'attack_detected'),
            ];
          }
        }

        return {
          ...prev,
          graphData,
          trafficLogs,
          sessionThreatLogs,
          videoExportFrames,
          intruderAlerts,
          isMonitoring: true,
          lastUpdated: log.timestamp,
          packetThroughput: packetCountRef.current,
          backgroundPacketCount: backgroundCountRef.current,
        };
      });

      if (matches && isRecordingRef.current) {
        triggerCapture('attack-detected');
      }
    },
    [triggerCapture]
  );

  const disconnectNetwork = useCallback(() => {
    streamRef.current?.disconnect();
    streamRef.current = null;
    packetCountRef.current = 0;
    backgroundCountRef.current = 0;
    graphRef.current = createInitialGraphData();
    setState((prev) => ({
      ...prev,
      graphData: createInitialGraphData(),
      devices: [],
      trafficLogs: [],
      sessionThreatLogs: prev.isRecordingSession ? prev.sessionThreatLogs : [],
      isMonitoring: false,
      connectionStatus: 'disconnected',
      connectionMessage: 'Disconnected',
      packetThroughput: 0,
      backgroundPacketCount: 0,
      selectedDeviceId: null,
      intruderAlerts: [],
      dataSourceMode: 'simulated',
    }));
  }, []);

  const connectNetwork = useCallback(
    (config: NetworkConnectionConfig) => {
      disconnectNetwork();

      const monitoringMode = config.monitoringMode ?? 'continuous';
      const dataSourceMode = isValidTargetAddress(config.targetIp)
        ? 'live'
        : 'simulated';

      setState((prev) => ({
        ...prev,
        connectionConfig: config,
        monitoringMode,
        trafficMode: monitoringModeToLegacy(monitoringMode),
        dataSourceMode,
        connectionStatus: 'connecting',
        connectionMessage:
          dataSourceMode === 'live'
            ? `Linking to ${config.targetIp.trim()}…`
            : 'Connecting demo stream…',
        graphData: createInitialGraphData(),
        trafficLogs: [],
        devices: [],
        sessionThreatLogs: prev.isRecordingSession ? prev.sessionThreatLogs : [],
        intruderAlerts: [],
        videoExportFrames: prev.isRecordingSession ? prev.videoExportFrames : [],
      }));

      graphRef.current = createInitialGraphData();
      monitoringModeRef.current = monitoringMode;
      packetCountRef.current = 0;
      backgroundCountRef.current = 0;

      streamRef.current = connectTrafficStream(config, {
        onPacket: processTrafficPacket,
        onStatusChange: (status, message) => {
          setState((prev) => ({
            ...prev,
            connectionStatus: status,
            connectionMessage:
              status === 'connected' && prev.dataSourceMode === 'live'
                ? `Live tether · ${prev.connectionConfig?.targetIp ?? 'target'}`
                : message ?? prev.connectionMessage,
            isMonitoring: status === 'connected',
          }));
        },
      });
    },
    [disconnectNetwork, processTrafficPacket]
  );

  useEffect(() => {
    const decay = setInterval(() => {
      setState((prev) => {
        if (
          prev.monitoringMode === 'silent_alert' &&
          prev.intruderAlerts.length === 0
        ) {
          return prev;
        }
        const graphData = pruneGhostLinks(decayLinkTraffic(prev.graphData));
        graphRef.current = graphData;
        return { ...prev, graphData };
      });
    }, 250);

    const throughputTick = setInterval(() => {
      setState((prev) => {
        const activeLinks = prev.graphData.links.filter(
          (l) => (l.trafficIntensity ?? 0) > 0.15
        ).length;
        const base =
          activeLinks * 180 +
          prev.trafficLogs.length * 40 +
          prev.backgroundPacketCount * 2;
        return { ...prev, packetThroughput: Math.max(base, packetCountRef.current) };
      });
    }, 500);

    return () => {
      clearInterval(decay);
      clearInterval(throughputTick);
      streamRef.current?.disconnect();
    };
  }, []);

  const applyDevice = useCallback(
    (device: NetworkDevice) => {
      setState((prev) => {
        const devices = [device, ...prev.devices].slice(0, MAX_DEVICES);
        let graphData = appendDeviceToGraph(graphRef.current, device);

        const nonCenter = graphData.nodes.filter((n) => !n.isCenter);
        if (nonCenter.length > MAX_DEVICES) {
          const removeCount = nonCenter.length - MAX_DEVICES;
          const removedIds = new Set(
            nonCenter.slice(-removeCount).map((n) => n.id)
          );
          graphData = removeNodesFromGraph(graphData, removedIds);
        }

        graphData = pruneGhostLinks(graphData);

        const isIntruder = device.nodeType === 'intruder';
        const log: TrafficLogEntry | null = isIntruder
          ? {
              id: crypto.randomUUID(),
              sourceIp: device.ip,
              destIp: '127.0.0.1',
              protocol: device.protocol,
              status: 'threat',
              timestamp: device.timestamp,
              isThreat: true,
              signatures: ['simulated_intruder'],
            }
          : null;

        let trafficLogs = prev.trafficLogs;
        let sessionThreatLogs = prev.sessionThreatLogs;
        let intruderAlerts = prev.intruderAlerts;
        let videoExportFrames = prev.videoExportFrames;

        if (log) {
          trafficLogs = [log, ...prev.trafficLogs].slice(0, MAX_LOGS);
          const alert: IntruderAlert = {
            id: crypto.randomUUID(),
            message: 'Simulated intruder node detected',
            sourceIp: device.ip,
            destIp: '127.0.0.1',
            signatures: ['simulated_intruder'],
            timestamp: device.timestamp,
            dismissed: false,
          };
          intruderAlerts = [alert, ...intruderAlerts].slice(0, MAX_ALERTS);

          if (prev.isRecordingSession) {
            sessionThreatLogs = [log, ...sessionThreatLogs];
            videoExportFrames = [
              ...videoExportFrames,
              createVideoExportFrame(graphData, 'simulated_intruder'),
            ];
          }
        }

        graphRef.current = graphData;

        if (log && prev.isRecordingSession) {
          queueMicrotask(() => triggerCapture('simulated-intruder'));
        }

        return {
          ...prev,
          devices,
          graphData,
          trafficLogs,
          sessionThreatLogs,
          videoExportFrames,
          intruderAlerts,
          isMonitoring: true,
          lastUpdated: device.timestamp,
        };
      });
    },
    [triggerCapture]
  );

  const selectDevice = useCallback((deviceId: string | null) => {
    setState((prev) => ({ ...prev, selectedDeviceId: deviceId }));
  }, []);

  const generateSafeNodes = useCallback(() => {
    for (let i = 0; i < SAFE_NODE_BATCH; i++) {
      setTimeout(() => applyDevice(createSimulatedDevice('trusted')), i * 200);
    }
  }, [applyDevice]);

  const generateIntruder = useCallback(() => {
    applyDevice(createSimulatedDevice('intruder'));
  }, [applyDevice]);

  const simulateAttackedTraffic = useCallback(() => {
    const graph = graphRef.current;
    const intruderNode = graph.nodes.find((n) => n.nodeType === 'intruder');
    const trustedNodes = graph.nodes.filter((n) => n.nodeType === 'trusted');

    if (!intruderNode) {
      applyDevice(createSimulatedDevice('intruder'));
      setTimeout(() => simulateAttackedTraffic(), 500);
      return;
    }

    if (trustedNodes.length === 0) {
      applyDevice(createSimulatedDevice('trusted'));
      setTimeout(() => simulateAttackedTraffic(), 500);
      return;
    }

    const targets = trustedNodes.slice(0, 3);
    targets.forEach((target, index) => {
      setTimeout(() => {
        setState((prev) => {
          const graphData = createAttackLinkBetween(
            graphRef.current,
            intruderNode.id,
            target.id,
            'TCP'
          );

          graphRef.current = graphData;

          const log: TrafficLogEntry = {
            id: crypto.randomUUID(),
            sourceIp: intruderNode.ip ?? intruderNode.label,
            destIp: target.ip ?? target.label,
            protocol: 'TCP',
            status: 'threat',
            timestamp: new Date(),
            isThreat: true,
            signatures: ['attack_simulation'],
          };

          const alert: IntruderAlert = {
            id: crypto.randomUUID(),
            message: 'Simulated attack traffic detected',
            sourceIp: log.sourceIp,
            destIp: log.destIp,
            signatures: ['attack_simulation'],
            timestamp: log.timestamp,
            dismissed: false,
          };

          let sessionThreatLogs = prev.sessionThreatLogs;
          let videoExportFrames = prev.videoExportFrames;
          if (prev.isRecordingSession) {
            sessionThreatLogs = [log, ...sessionThreatLogs];
            videoExportFrames = [
              ...videoExportFrames,
              createVideoExportFrame(graphData, 'attack_simulation'),
            ];
          }

          if (prev.isRecordingSession) {
            queueMicrotask(() => triggerCapture('attack-simulation'));
          }

          return {
            ...prev,
            graphData,
            trafficLogs: [log, ...prev.trafficLogs].slice(0, MAX_LOGS),
            sessionThreatLogs,
            videoExportFrames,
            intruderAlerts: [alert, ...prev.intruderAlerts].slice(0, MAX_ALERTS),
            lastUpdated: new Date(),
            packetThroughput: prev.packetThroughput + 500,
          };
        });
      }, index * 450);
    });
  }, [applyDevice, triggerCapture]);

  const toggleRecordSession = useCallback(() => {
    setState((prev) => {
      const isRecordingSession = !prev.isRecordingSession;
      isRecordingRef.current = isRecordingSession;
      return {
        ...prev,
        isRecordingSession,
        sessionThreatLogs: isRecordingSession ? prev.sessionThreatLogs : [],
        videoExportFrames: isRecordingSession ? prev.videoExportFrames : [],
      };
    });
  }, []);

  const exportLogs = useCallback(() => {
    const gauge = computeThreatLevel(
      state.graphData.nodes.filter((n) => n.nodeType === 'intruder').length,
      state.graphData.nodes.filter((n) => n.nodeType === 'trusted').length
    );
    const meta = buildSessionMeta(
      state.connectionConfig,
      state.isRecordingSession,
      state.dataSourceMode
    );

    exportTelemetryJson({
      exportedAt: new Date().toISOString(),
      session: meta,
      connectionStatus: state.connectionStatus,
      connectionMessage: state.connectionMessage,
      threatGauge: {
        tier: gauge.tier,
        label: gauge.label,
        ratio: gauge.ratio,
        intruderCount: gauge.intruderCount,
        trustedCount: gauge.trustedCount,
      },
      packetThroughput: state.packetThroughput,
      backgroundPacketCount: state.backgroundPacketCount,
      nodeCount: state.graphData.nodes.filter((n) => !n.isCenter).length,
      graph: {
        nodeCount: state.graphData.nodes.length,
        linkCount: state.graphData.links.length,
        intruderNodes: gauge.intruderCount,
        trustedNodes: gauge.trustedCount,
      },
      trafficLogs: state.trafficLogs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      sessionThreatLogs: state.sessionThreatLogs.map((log) => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      intruderAlerts: state.intruderAlerts.map((alert) => ({
        ...alert,
        timestamp: alert.timestamp.toISOString(),
      })),
    });
  }, [state]);

  const snapshot = useCallback(() => {
    triggerCapture('snapshot', 2);
    setState((prev) => {
      if (!prev.isRecordingSession) return prev;
      return {
        ...prev,
        videoExportFrames: [
          ...prev.videoExportFrames,
          createVideoExportFrame(graphRef.current, 'manual_snapshot'),
        ],
      };
    });
  }, [triggerCapture]);

  const exportSessionLogsJson = useCallback(() => {
    const meta = buildSessionMeta(
      state.connectionConfig,
      state.isRecordingSession,
      state.dataSourceMode
    );
    const logs =
      state.sessionThreatLogs.length > 0
        ? state.sessionThreatLogs
        : state.trafficLogs.filter((l) => l.isThreat);
    exportThreatLogsJson(logs, meta);
  }, [state.connectionConfig, state.isRecordingSession, state.sessionThreatLogs, state.trafficLogs]);

  const exportSessionLogsText = useCallback(() => {
    const meta = buildSessionMeta(
      state.connectionConfig,
      state.isRecordingSession,
      state.dataSourceMode
    );
    const logs =
      state.sessionThreatLogs.length > 0
        ? state.sessionThreatLogs
        : state.trafficLogs.filter((l) => l.isThreat);
    exportThreatLogsText(logs, meta);
  }, [state.connectionConfig, state.isRecordingSession, state.sessionThreatLogs, state.trafficLogs]);

  const captureMap = useCallback(() => {
    snapshot();
  }, [snapshot]);

  const prepareVideoExport = useCallback(() => {
    const meta = buildSessionMeta(
      state.connectionConfig,
      state.isRecordingSession,
      state.dataSourceMode
    );
    const frames =
      state.videoExportFrames.length > 0
        ? state.videoExportFrames
        : [createVideoExportFrame(graphRef.current, 'snapshot')];
    exportVideoExportManifest(frames, meta);
  }, [state.connectionConfig, state.isRecordingSession, state.videoExportFrames]);

  const dismissIntruderAlert = useCallback((alertId: string) => {
    setState((prev) => ({
      ...prev,
      intruderAlerts: prev.intruderAlerts.map((a) =>
        a.id === alertId ? { ...a, dismissed: true } : a
      ),
    }));
  }, []);

  const selectedDevice = useMemo(() => {
    if (!state.selectedDeviceId) return null;
    const fromDevices = state.devices.find((d) => d.id === state.selectedDeviceId);
    if (fromDevices) return fromDevices;

    const node = state.graphData.nodes.find((n) => n.id === state.selectedDeviceId);
    if (!node || node.isCenter) return null;

    return {
      id: node.id,
      ip: node.ip ?? node.label,
      hostname: node.hostname ?? node.label,
      nodeType: node.nodeType,
      threatLevel: node.threatLevel ?? 1,
      timestamp: state.lastUpdated ?? new Date(),
      status: 'active' as const,
      macAddress: '—',
      protocol: '—',
      port: 0,
    };
  }, [state.devices, state.selectedDeviceId, state.graphData.nodes, state.lastUpdated]);

  const activeTrafficLogs = useMemo(() => state.trafficLogs, [state.trafficLogs]);
  const activeIntruderAlerts = useMemo(
    () => state.intruderAlerts.filter((a) => !a.dismissed),
    [state.intruderAlerts]
  );

  const intruderCount = useMemo(
    () => state.graphData.nodes.filter((n) => n.nodeType === 'intruder').length,
    [state.graphData.nodes]
  );

  const trustedCount = useMemo(
    () => state.graphData.nodes.filter((n) => n.nodeType === 'trusted').length,
    [state.graphData.nodes]
  );

  const nodeCount = useMemo(
    () => state.graphData.nodes.filter((n) => !n.isCenter).length,
    [state.graphData.nodes]
  );

  const threatLevelGauge = useMemo(
    () => computeThreatLevel(intruderCount, trustedCount),
    [intruderCount, trustedCount]
  );

  return {
    ...state,
    activeTrafficLogs,
    activeIntruderAlerts,
    selectedDevice,
    intruderCount,
    trustedCount,
    nodeCount,
    threatLevelGauge,
    totalDevices: state.devices.length,
    selectDevice,
    connectNetwork,
    disconnectNetwork,
    generateSafeNodes,
    generateIntruder,
    simulateAttackedTraffic,
    toggleRecordSession,
    exportLogs,
    snapshot,
    exportSessionLogsJson,
    exportSessionLogsText,
    captureMap,
    prepareVideoExport,
    dismissIntruderAlert,
  };
}
