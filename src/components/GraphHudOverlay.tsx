interface GraphHudOverlayProps {
  packetThroughput: number;
  nodeCount: number;
  intruderCount: number;
  onConfigureNetwork: () => void;
}

function formatThroughput(pps: number): string {
  if (pps >= 1_000_000) return `${(pps / 1_000_000).toFixed(2)} Mpkt/s`;
  if (pps >= 1_000) return `${(pps / 1_000).toFixed(1)} Kpkt/s`;
  return `${pps} pkt/s`;
}

export default function GraphHudOverlay({
  packetThroughput,
  nodeCount,
  intruderCount,
  onConfigureNetwork,
}: GraphHudOverlayProps) {
  return (
    <>
      <div className="hud-panel pointer-events-auto rounded-lg px-3 py-2">
        <p className="hud-label text-[9px]">Packet Throughput</p>
        <p className="hud-value text-lg tabular-nums text-sentinel-cyan">
          {formatThroughput(packetThroughput)}
        </p>
        <div className="mt-1.5 h-1 w-full min-w-[7rem] max-w-[8rem] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sentinel-blue to-sentinel-cyan transition-all duration-300"
            style={{
              width: `${Math.min(100, (packetThroughput / 8000) * 100)}%`,
            }}
          />
        </div>
      </div>

      <div className="hud-panel pointer-events-auto rounded-lg px-3 py-2">
        <div className="flex gap-4 font-mono text-[10px]">
          <div>
            <span className="text-gray-400">NODES </span>
            <span className="font-medium text-white">{nodeCount}</span>
          </div>
          <div>
            <span className="text-gray-400">THREATS </span>
            <span
              className={`font-medium ${
                intruderCount > 0 ? 'text-sentinel-red' : 'text-sentinel-green'
              }`}
            >
              {intruderCount}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onConfigureNetwork}
          className="mt-2 w-full rounded border border-white/10 bg-gray-950/50 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-sentinel-cyan transition-colors hover:border-sentinel-cyan/40 hover:bg-sentinel-cyan/10"
        >
          Configure Network
        </button>
      </div>
    </>
  );
}
