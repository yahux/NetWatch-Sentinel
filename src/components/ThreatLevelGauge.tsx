import type { ThreatLevelGaugeState } from '../utils/threatLevel';

interface ThreatLevelGaugeProps {
  gauge: ThreatLevelGaugeState;
}

const tierAccent: Record<
  ThreatLevelGaugeState['tier'],
  { text: string; glow: string; marker: string }
> = {
  secure: {
    text: 'text-sentinel-green',
    glow: 'shadow-[0_0_12px_rgba(0,255,136,0.35)]',
    marker: 'bg-sentinel-green border-sentinel-green/60',
  },
  caution: {
    text: 'text-yellow-400',
    glow: 'shadow-[0_0_12px_rgba(250,204,21,0.35)]',
    marker: 'bg-yellow-400 border-yellow-400/60',
  },
  critical: {
    text: 'text-sentinel-red',
    glow: 'shadow-[0_0_14px_rgba(255,40,70,0.45)]',
    marker: 'bg-sentinel-red border-sentinel-red/60',
  },
};

export default function ThreatLevelGauge({ gauge }: ThreatLevelGaugeProps) {
  const accent = tierAccent[gauge.tier];
  const ratioPct = gauge.percent;

  return (
    <div
      className={`hud-panel min-w-[11rem] rounded-lg px-3 py-2 sm:min-w-[13rem] ${
        gauge.isPanicMode ? 'border-red-900/50 shadow-glow-red' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="hud-label text-[9px]">Threat Level</p>
        <span className={`font-mono text-[10px] font-medium uppercase ${accent.text}`}>
          {gauge.label}
          {gauge.isPanicMode ? ' ⚠' : ''}
        </span>
      </div>

      <div className="relative mt-2">
        <div className="flex h-2 overflow-hidden rounded-full border border-white/10">
          <div
            className="h-full flex-1 bg-sentinel-green/70"
            title="Secure"
          />
          <div
            className="h-full flex-1 border-x border-white/10 bg-yellow-400/70"
            title="Caution"
          />
          <div
            className="h-full flex-1 bg-sentinel-red/70"
            title="Critical"
          />
        </div>

        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${accent.marker} ${accent.glow} transition-all duration-500`}
          style={{ left: `${gauge.position}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[8px] text-gray-500">
        <span>Secure</span>
        <span>Caution</span>
        <span>Critical</span>
      </div>

      <p className="mt-1 font-mono text-[9px] text-gray-500">
        {gauge.intruderCount} intruder / {gauge.trustedCount} safe
        {gauge.intruderCount + gauge.trustedCount > 0 ? ` · ${ratioPct}%` : ''}
      </p>
    </div>
  );
}
