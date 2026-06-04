import { useMemo } from 'react';
import type { IntruderAlert } from '../types/network';
import { useTypewriter } from '../hooks/useTypewriter';
import { buildThreatAnalysisScript } from '../services/threatAnalysisScript';

interface ThreatAnalysisPanelProps {
  visible: boolean;
  latestAlert: IntruderAlert | null;
}

export default function ThreatAnalysisPanel({
  visible,
  latestAlert,
}: ThreatAnalysisPanelProps) {
  const scriptKey = latestAlert?.id ?? 'idle';
  const lines = useMemo(
    () => buildThreatAnalysisScript(latestAlert),
    [scriptKey, latestAlert]
  );
  const { output, isComplete } = useTypewriter(lines, visible, scriptKey, 20);

  if (!visible) return null;

  return (
    <div
      className="hud-panel pointer-events-none absolute right-3 top-2 z-20 w-72 animate-slide-in rounded-lg p-3 shadow-glow-red sm:w-80"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sentinel-red opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-sentinel-red" />
        </span>
        <h3 className="font-display text-[10px] font-bold uppercase tracking-widest text-sentinel-red">
          AI Threat Analysis
        </h3>
      </div>

      <pre className="mt-2 min-h-[8.5rem] whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-gray-300">
        {output}
        {!isComplete && (
          <span className="ml-0.5 inline-block animate-pulse text-sentinel-cyan">▌</span>
        )}
      </pre>

      {isComplete && (
        <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-sentinel-red/70">
          Autonomous response engaged
        </p>
      )}
    </div>
  );
}
