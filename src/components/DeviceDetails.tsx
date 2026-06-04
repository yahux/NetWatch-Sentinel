import type { NetworkDevice } from '../types/network';

interface DeviceDetailsProps {
  device: NetworkDevice | null;
  onClose: () => void;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-2 last:border-0">
      <span className="hud-label">{label}</span>
      <span className="truncate font-mono text-xs font-medium text-white">{value}</span>
    </div>
  );
}

function nodeTypeBadge(type: NetworkDevice['nodeType']): string {
  switch (type) {
    case 'intruder':
      return 'border-sentinel-red/50 bg-sentinel-red/15 text-sentinel-red';
    case 'trusted':
      return 'border-sentinel-green/40 bg-sentinel-green/10 text-sentinel-green';
    default:
      return 'border-sentinel-cyan/40 bg-sentinel-cyan/10 text-sentinel-cyan';
  }
}

export default function DeviceDetails({ device, onClose }: DeviceDetailsProps) {
  const visible = device !== null;

  return (
    <div
      className={`pointer-events-none absolute bottom-4 right-56 z-20 w-72 transition-all duration-300 ease-out ${
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-8 opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`pointer-events-auto hud-panel rounded-lg shadow-2xl ${
          visible ? 'shadow-glow' : ''
        }`}
      >
        {device && (
          <>
            <header className="hud-panel-header flex items-start justify-between px-4 py-3">
              <div>
                <p className="font-display text-xs font-bold uppercase tracking-widest text-sentinel-cyan">
                  Device Details
                </p>
                <p className="mt-1 font-mono text-sm text-white">{device.ip}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hud-glass rounded px-2 py-0.5 font-mono text-[10px] text-gray-400 transition-colors hover:border-sentinel-cyan/40 hover:text-sentinel-cyan"
                aria-label="Close device details"
              >
                ESC
              </button>
            </header>

            <div className="px-4 py-2">
              <span
                className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${nodeTypeBadge(device.nodeType)}`}
              >
                {device.nodeType}
              </span>
            </div>

            <div className="px-4 pb-4">
              <DetailRow label="Hostname" value={device.hostname} />
              <DetailRow label="MAC" value={device.macAddress} />
              <DetailRow label="Protocol" value={device.protocol} />
              <DetailRow label="Port" value={String(device.port)} />
              <DetailRow
                label="Threat"
                value={`${device.threatLevel} / 10`}
              />
              <DetailRow label="Status" value={device.status} />
              <DetailRow
                label="Detected"
                value={device.timestamp.toLocaleTimeString('en-US', {
                  hour12: false,
                })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
