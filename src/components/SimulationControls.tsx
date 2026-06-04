import { useState } from 'react';

interface SimulationControlsProps {
  onGenerateSafeNodes: () => void;
  onGenerateIntruder: () => void;
  onSimulateAttackedTraffic: () => void;
}

const menuButtonClass =
  'hud-glass w-full rounded-md px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-sentinel-cyan/40 hover:bg-gray-950/70 hover:text-sentinel-cyan';

export default function SimulationControls({
  onGenerateSafeNodes,
  onGenerateIntruder,
  onSimulateAttackedTraffic,
}: SimulationControlsProps) {
  const [expanded, setExpanded] = useState(false);

  const runAction = (action: () => void) => {
    action();
    setExpanded(false);
  };

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {expanded && (
        <div className="hud-panel flex w-56 flex-col gap-1.5 rounded-lg p-2 animate-slide-in">
          <p className="hud-label px-1 pb-1">Simulation Control</p>
          <button
            type="button"
            className={`${menuButtonClass} text-sentinel-green`}
            onClick={() => runAction(onGenerateSafeNodes)}
          >
            Generate Safe Nodes
          </button>
          <button
            type="button"
            className={`${menuButtonClass} text-sentinel-red`}
            onClick={() => runAction(onGenerateIntruder)}
          >
            Generate Intruder
          </button>
          <button
            type="button"
            className={`${menuButtonClass} text-orange-400`}
            onClick={() => runAction(onSimulateAttackedTraffic)}
          >
            Simulate Attacked Traffic
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="hud-panel rounded-lg px-4 py-2 font-display text-xs font-bold uppercase tracking-widest text-sentinel-cyan transition-colors hover:border-sentinel-cyan/40 hover:text-white"
        aria-expanded={expanded}
        aria-label="Toggle simulation controls"
      >
        {expanded ? 'Close' : 'Test'}
      </button>
    </div>
  );
}
