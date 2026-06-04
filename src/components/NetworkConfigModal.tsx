import { useEffect, useState } from 'react';
import type {
  ConnectionStatus,
  MonitoringMode,
  NetworkConnectionConfig,
} from '../types/network';
import { isValidTargetAddress } from '../utils/targetValidation';

interface NetworkConfigModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (config: NetworkConnectionConfig) => void;
  onDisconnect: () => void;
  connectionStatus: ConnectionStatus;
  connectionMessage: string;
  initialConfig?: NetworkConnectionConfig | null;
}

function TetherLed({ status }: { status: ConnectionStatus }) {
  const isActive = status === 'connected';
  const isIdle =
    status === 'disconnected' ||
    status === 'connecting' ||
    status === 'error';

  const colorClass = isActive
    ? 'bg-sentinel-green shadow-[0_0_10px_#00ff88]'
    : isIdle
      ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
      : 'bg-gray-500';

  const label = isActive ? 'Tether active' : status === 'connecting' ? 'Linking…' : 'Idle';

  return (
    <div
      className="hud-glass flex items-center gap-2 rounded-full px-2.5 py-1"
      title={`Connect status: ${label}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${colorClass} ${isActive ? 'animate-pulse' : ''}`}
        aria-hidden
      />
      <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400">
        {label}
      </span>
    </div>
  );
}

export default function NetworkConfigModal({
  open,
  onClose,
  onConnect,
  onDisconnect,
  connectionStatus,
  connectionMessage,
  initialConfig,
}: NetworkConfigModalProps) {
  const [endpointUrl, setEndpointUrl] = useState(
    initialConfig?.endpointUrl ?? ''
  );
  const [targetIp, setTargetIp] = useState(initialConfig?.targetIp ?? '');
  const [serviceName, setServiceName] = useState(
    initialConfig?.serviceName ?? ''
  );
  const [monitoringMode, setMonitoringMode] = useState<MonitoringMode>(
    initialConfig?.monitoringMode ?? 'continuous'
  );

  useEffect(() => {
    if (open && initialConfig) {
      setEndpointUrl(initialConfig.endpointUrl);
      setTargetIp(initialConfig.targetIp);
      setServiceName(initialConfig.serviceName);
      setMonitoringMode(initialConfig.monitoringMode ?? 'continuous');
    }
  }, [open, initialConfig]);

  if (!open) return null;

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const willUseLiveMode = isValidTargetAddress(targetIp);

  const handleConnect = () => {
    onConnect({
      endpointUrl: endpointUrl.trim(),
      targetIp: targetIp.trim(),
      serviceName: serviceName.trim(),
      monitoringMode,
    });
    onClose();
  };

  return (
    <div className="pointer-events-auto hud-overlay-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="hud-panel relative w-full max-w-lg rounded-xl p-6 shadow-2xl"
        role="dialog"
        aria-labelledby="network-config-title"
      >
        <div className="absolute right-4 top-4">
          <TetherLed status={connectionStatus} />
        </div>

        <header className="mb-5 pr-28">
          <h2
            id="network-config-title"
            className="font-display text-sm font-bold uppercase tracking-widest text-sentinel-cyan"
          >
            Connect Target
          </h2>
          <p className="hud-label mt-1">Configure network endpoint & monitoring</p>
        </header>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="target-ip" className="hud-label mb-1.5 block">
                DNS / IP Address
              </label>
              <input
                id="target-ip"
                type="text"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                placeholder="192.168.1.1 or api.internal"
                className="hud-glass w-full rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-gray-600 focus:border-sentinel-cyan/50 focus:outline-none focus:ring-1 focus:ring-sentinel-cyan/30"
              />
            </div>
            <div>
              <label htmlFor="service-name" className="hud-label mb-1.5 block">
                Environment Info
              </label>
              <input
                id="service-name"
                type="text"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Service name or Asset ID"
                className="hud-glass w-full rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-gray-600 focus:border-sentinel-cyan/50 focus:outline-none focus:ring-1 focus:ring-sentinel-cyan/30"
              />
            </div>
          </div>

          <div>
            <label htmlFor="endpoint-url" className="hud-label mb-1.5 block">
              Stream Endpoint URL
            </label>
            <input
              id="endpoint-url"
              type="url"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              placeholder="http://localhost:8000 or wss://…"
              className="hud-glass w-full rounded-lg px-3 py-2 font-mono text-xs text-white placeholder:text-gray-600 focus:border-sentinel-cyan/50 focus:outline-none focus:ring-1 focus:ring-sentinel-cyan/30"
            />
            <p className="mt-1 font-mono text-[9px] text-gray-500">
              Leave empty for demo stream · WebSocket or REST /api/traffic
            </p>
          </div>

          <div className="hud-glass rounded-lg px-3 py-2">
            <p className="hud-label">Data Source Mode</p>
            <p
              className={`mt-1 font-mono text-xs ${
                willUseLiveMode ? 'text-sentinel-green' : 'text-yellow-400'
              }`}
            >
              {willUseLiveMode
                ? '● Live — valid target IP will tether monitoring'
                : '◐ Simulated — enter a valid DNS/IP to switch to Live'}
            </p>
          </div>

          <div>
            <p className="hud-label mb-2">Monitoring Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMonitoringMode('continuous')}
                className={`rounded-lg border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  monitoringMode === 'continuous'
                    ? 'border-sentinel-cyan/50 bg-sentinel-cyan/10 text-sentinel-cyan'
                    : 'border-white/10 bg-gray-950/40 text-gray-400 hover:border-white/20'
                }`}
              >
                Continuous Flow
                <span className="mt-0.5 block text-[9px] normal-case tracking-normal text-gray-500">
                  Visualize all traffic on the graph
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMonitoringMode('silent_alert')}
                className={`rounded-lg border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  monitoringMode === 'silent_alert'
                    ? 'border-sentinel-red/50 bg-sentinel-red/10 text-sentinel-red'
                    : 'border-white/10 bg-gray-950/40 text-gray-400 hover:border-white/20'
                }`}
              >
                Silent Alert Mode
                <span className="mt-0.5 block text-[9px] normal-case tracking-normal text-gray-500">
                  Background ingest · UI on threat signatures only
                </span>
              </button>
            </div>
          </div>

          <div className="hud-glass rounded-lg px-3 py-2">
            <p className="hud-label">Link Status</p>
            <p
              className={`mt-1 font-mono text-xs ${
                isConnected
                  ? 'text-sentinel-green'
                  : connectionStatus === 'error'
                    ? 'text-sentinel-red'
                    : 'text-gray-400'
              }`}
            >
              {isConnecting ? '◌ Connecting…' : isConnected ? '● Connected' : '○ Disconnected'}
              {' — '}
              {connectionMessage}
            </p>
          </div>
        </div>

        <footer className="mt-6 flex gap-2">
          {isConnected && (
            <button
              type="button"
              onClick={() => {
                onDisconnect();
                onClose();
              }}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-300 hover:border-sentinel-red/40 hover:text-sentinel-red"
            >
              Disconnect
            </button>
          )}
          <button
            type="button"
            onClick={handleConnect}
            disabled={isConnecting}
            className="flex-1 rounded-lg border border-sentinel-cyan/40 bg-sentinel-cyan/15 px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-sentinel-cyan transition-colors hover:bg-sentinel-cyan/25 disabled:opacity-50"
          >
            Connect
          </button>
        </footer>
      </div>
    </div>
  );
}
