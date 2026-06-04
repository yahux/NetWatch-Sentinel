import { useEffect, useRef, useState } from 'react';
import DeviceDetails from './components/DeviceDetails';
import ForensicRecorder from './components/ForensicRecorder';
import GraphHudOverlay from './components/GraphHudOverlay';
import NetworkConfigModal from './components/NetworkConfigModal';
import NetworkGraph from './components/NetworkGraph';
import SimulationControls from './components/SimulationControls';
import SystemStatusMonitor from './components/SystemStatusMonitor';
import ThreatAnalysisPanel from './components/ThreatAnalysisPanel';
import ThreatLevelGauge from './components/ThreatLevelGauge';
import TrafficLogs from './components/TrafficLogs';
import { useNetworkData } from './hooks/useNetworkData';
import type { GraphCaptureHandle } from './types/network';

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'cyan' | 'red' | 'green';
}) {
  const accentClass =
    accent === 'red'
      ? 'text-sentinel-red'
      : accent === 'green'
        ? 'text-sentinel-green'
        : 'text-sentinel-cyan';

  return (
    <div className="hud-panel pointer-events-auto rounded-lg px-4 py-3">
      <p className="hud-label">{label}</p>
      <p className={`hud-value mt-1 text-2xl ${accentClass}`}>{value}</p>
    </div>
  );
}

function MonitoringBadge({
  isMonitoring,
  dataSourceMode,
}: {
  isMonitoring: boolean;
  dataSourceMode: 'simulated' | 'live';
}) {
  if (!isMonitoring) {
    return (
      <span className="hud-glass rounded-full px-3 py-1 font-mono text-xs text-gray-400">
        ○ STANDBY
      </span>
    );
  }

  if (dataSourceMode === 'live') {
    return (
      <span className="hud-glass rounded-full border border-sentinel-green/50 px-3 py-1 font-mono text-xs text-sentinel-green">
        ● MONITORING ACTIVE
      </span>
    );
  }

  return (
    <span className="hud-glass rounded-full border border-yellow-500/40 px-3 py-1 font-mono text-xs text-yellow-400">
      ◐ SIMULATED
    </span>
  );
}

/** Permanent proprietary branding — hardcoded root watermark. */
function YahuxWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[-1] flex select-none items-center justify-center"
      aria-hidden
    >
      <span className="font-display text-9xl font-bold tracking-[0.2em] text-white opacity-[0.05] sm:text-[12rem]">
        YAHUX
      </span>
    </div>
  );
}

export default function App() {
  const [configOpen, setConfigOpen] = useState(false);
  const graphCaptureRef = useRef<GraphCaptureHandle>(null);

  const {
    graphData,
    activeTrafficLogs,
    activeIntruderAlerts,
    selectedDevice,
    isMonitoring,
    packetThroughput,
    intruderCount,
    nodeCount,
    lastUpdated,
    connectionConfig,
    connectionStatus,
    connectionMessage,
    monitoringMode,
    dataSourceMode,
    backgroundPacketCount,
    isRecordingSession,
    sessionThreatLogs,
    videoExportFrames,
    threatLevelGauge,
    selectDevice,
    connectNetwork,
    disconnectNetwork,
    generateSafeNodes,
    generateIntruder,
    simulateAttackedTraffic,
    toggleRecordSession,
    exportLogs,
    snapshot,
    prepareVideoExport,
    dismissIntruderAlert,
  } = useNetworkData(graphCaptureRef);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectDevice(null);
        setConfigOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectDevice]);

  const intruderIp =
    activeIntruderAlerts[0]?.sourceIp ??
    graphData.nodes.find((n) => n.nodeType === 'intruder')?.ip ??
    'UNKNOWN';

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden text-white ring-1 ring-inset ring-transparent ${
        threatLevelGauge.isPanicMode ? 'panic-mode' : ''
      }`}
    >
      <div className="absolute inset-0 -z-20 bg-gray-950" aria-hidden />
      <YahuxWatermark />

      <div className="absolute inset-0 z-0">
        <NetworkGraph
          ref={graphCaptureRef}
          graphData={graphData}
          nodeCount={nodeCount}
          onNodeSelect={selectDevice}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <header className="hud-panel pointer-events-auto grid shrink-0 grid-cols-1 items-center gap-3 border-b border-white/10 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6">
          <div className="flex min-w-0 items-center gap-3 sm:justify-self-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded hud-glass">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-sentinel-cyan"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold tracking-wider text-white sm:text-lg">
                NETWATCH <span className="text-sentinel-cyan">SENTINEL</span>
              </h1>
              <p className="hud-label truncate tracking-widest">
                Network Traffic Visualizer
                {connectionConfig?.serviceName
                  ? ` · ${connectionConfig.serviceName}`
                  : ''}
              </p>
            </div>
          </div>

          <SystemStatusMonitor
            intruderDetected={intruderCount > 0}
            intruderIp={intruderIp}
          />

          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-self-end sm:justify-end sm:gap-3">
            {connectionConfig?.targetIp && (
              <span className="font-mono text-[10px] text-gray-500">
                TARGET {connectionConfig.targetIp}
              </span>
            )}
            <ThreatLevelGauge gauge={threatLevelGauge} />
            <MonitoringBadge
              isMonitoring={isMonitoring}
              dataSourceMode={dataSourceMode}
            />
          </div>
        </header>

        <div className="pointer-events-none flex min-h-0 flex-1 overflow-hidden">
          <TrafficLogs
            logs={activeTrafficLogs}
            isMonitoring={isMonitoring}
            monitoringMode={monitoringMode}
            intruderAlerts={activeIntruderAlerts}
            backgroundPacketCount={backgroundPacketCount}
            onDismissAlert={dismissIntruderAlert}
          />

          <main className="relative min-h-0 min-w-0 flex-1">
            <ThreatAnalysisPanel
              visible={intruderCount > 0}
              latestAlert={activeIntruderAlerts[0] ?? null}
            />

            <div className="pointer-events-none flex h-full flex-col p-3 sm:p-4">
              <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Discovered Nodes" value={nodeCount} accent="green" />
                <StatCard
                  label="Threat Nodes"
                  value={intruderCount}
                  accent={intruderCount > 0 ? 'red' : 'cyan'}
                />
                <StatCard
                  label="Last Packet"
                  value={
                    lastUpdated
                      ? lastUpdated.toLocaleTimeString('en-US', { hour12: false })
                      : '—'
                  }
                  accent="cyan"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <GraphHudOverlay
                  packetThroughput={packetThroughput}
                  nodeCount={nodeCount}
                  intruderCount={intruderCount}
                  onConfigureNetwork={() => setConfigOpen(true)}
                />
              </div>

              <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pb-10">
                <ForensicRecorder
                  isRecording={isRecordingSession}
                  sessionThreatCount={sessionThreatLogs.length}
                  videoFrameCount={videoExportFrames.length}
                  onToggleRecord={toggleRecordSession}
                  onExportLogs={exportLogs}
                  onSnapshot={snapshot}
                  onPrepareVideoExport={prepareVideoExport}
                />
              </div>
            </div>

            <SimulationControls
              onGenerateSafeNodes={generateSafeNodes}
              onGenerateIntruder={generateIntruder}
              onSimulateAttackedTraffic={simulateAttackedTraffic}
            />

            <DeviceDetails
              device={selectedDevice}
              onClose={() => selectDevice(null)}
            />

            <p className="pointer-events-none absolute bottom-3 left-1/2 hidden -translate-x-1/2 font-mono text-[10px] text-gray-500 sm:block">
              Configure network to stream · Scroll to zoom · Drag to pan
            </p>
          </main>
        </div>

        <NetworkConfigModal
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          onConnect={connectNetwork}
          onDisconnect={disconnectNetwork}
          connectionStatus={connectionStatus}
          connectionMessage={connectionMessage}
          initialConfig={connectionConfig}
        />
      </div>
    </div>
  );
}
