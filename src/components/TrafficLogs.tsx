import type { IntruderAlert, MonitoringMode, TrafficLogEntry } from '../types/network';

interface TrafficLogsProps {
  logs: TrafficLogEntry[];
  isMonitoring: boolean;
  monitoringMode: MonitoringMode;
  intruderAlerts: IntruderAlert[];
  backgroundPacketCount: number;
  onDismissAlert: (alertId: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function statusClass(status: TrafficLogEntry['status'], isThreat: boolean): string {
  if (isThreat || status === 'threat') {
    return 'border-sentinel-red/50 bg-sentinel-red/20 text-sentinel-red';
  }
  if (status === 'blocked') {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-400';
  }
  return 'border-sentinel-green/40 bg-sentinel-green/10 text-sentinel-green';
}

export default function TrafficLogs({
  logs,
  isMonitoring,
  monitoringMode,
  intruderAlerts,
  backgroundPacketCount,
  onDismissAlert,
}: TrafficLogsProps) {
  const activeAlerts = intruderAlerts.filter((a) => !a.dismissed);

  return (
    <aside className="pointer-events-none flex h-full w-72 shrink-0 flex-col gap-2 p-2 sm:w-80">
      <header className="hud-panel pointer-events-auto shrink-0 rounded-lg px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-sentinel-cyan">
            Traffic Logs
          </h2>
          <span
            className={`flex items-center gap-1.5 font-mono text-xs ${
              isMonitoring ? 'text-sentinel-green' : 'text-gray-400'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isMonitoring
                  ? 'animate-pulse bg-sentinel-green shadow-[0_0_8px_#00ff88]'
                  : 'bg-gray-500'
              }`}
            />
            {isMonitoring ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <p className="hud-label mt-1">
          {monitoringMode === 'silent_alert'
            ? `Silent alert · ${backgroundPacketCount} pkts background`
            : 'Continuous flow · all traffic visible'}
        </p>
      </header>

      {activeAlerts.length > 0 && (
        <div className="pointer-events-auto space-y-2">
          {activeAlerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className="animate-slide-in rounded-lg border border-sentinel-red/50 bg-sentinel-red/10 px-3 py-2.5 shadow-[0_0_20px_rgba(255,40,70,0.15)]"
              role="alert"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-[10px] font-bold uppercase tracking-wider text-sentinel-red">
                    Intruder Alert
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-gray-200">
                    {alert.message}
                  </p>
                  <p className="mt-1 truncate font-mono text-[9px] text-gray-400">
                    {alert.sourceIp} → {alert.destIp}
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] text-gray-500">
                    {formatTime(alert.timestamp)} · {alert.signatures.join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDismissAlert(alert.id)}
                  className="shrink-0 rounded border border-white/10 px-1.5 py-0.5 font-mono text-[8px] text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pointer-events-none min-h-0 flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 h-8 w-8 animate-pulse rounded-full border border-sentinel-cyan/30" />
            <p className="hud-body text-xs text-gray-300">
              {monitoringMode === 'silent_alert'
                ? 'Awaiting threat signatures…'
                : 'No traffic logged'}
            </p>
            <p className="mt-1 font-mono text-[10px] text-gray-500">
              Configure network to start streaming
            </p>
          </div>
        ) : (
          <ul className="pointer-events-auto hud-panel divide-y divide-white/10 rounded-lg">
            {logs.map((log, index) => (
              <li
                key={log.id}
                className="animate-slide-in px-4 py-3 transition-colors hover:bg-white/[0.04]"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-white">
                      <span className="text-sentinel-cyan">{log.sourceIp}</span>
                      <span className="mx-1 text-gray-600">→</span>
                      <span className="text-gray-300">{log.destIp}</span>
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 font-mono text-[10px] text-gray-500">
                      <span>{log.protocol}</span>
                      {log.destPort != null && <span>:{log.destPort}</span>}
                      <span>·</span>
                      <span>{formatTime(log.timestamp)}</span>
                    </div>
                    {log.signatures?.length ? (
                      <p className="mt-1 font-mono text-[8px] text-sentinel-red/80">
                        sig: {log.signatures.join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusClass(log.status, log.isThreat)}`}
                  >
                    {log.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="hud-panel pointer-events-auto shrink-0 rounded-lg px-4 py-3">
        <p className="hud-label">
          {logs.length} flow{logs.length !== 1 ? 's' : ''} recorded
        </p>
      </footer>
    </aside>
  );
}
