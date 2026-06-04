import TypewriterText from './TypewriterText';

const TELEMETRY_MESSAGES = [
  'SCANNING NETWORK...',
  'DETECTING ANOMALIES...',
  'ANALYZING THREAT SIGNATURES...',
];

interface SystemStatusMonitorProps {
  intruderDetected: boolean;
  intruderIp?: string;
}

export default function SystemStatusMonitor({
  intruderDetected,
  intruderIp = 'UNKNOWN',
}: SystemStatusMonitorProps) {
  const alertMessage = `WARNING: INTRUSION DETECTED AT ${intruderIp}`;
  const messages = intruderDetected ? [alertMessage] : TELEMETRY_MESSAGES;
  const resetKey = intruderDetected ? `alert-${intruderIp}` : 'telemetry';

  return (
    <div className="hud-status-monitor pointer-events-none w-full min-w-0 max-w-md justify-self-center px-3 py-1.5 sm:w-auto">
      <TypewriterText
        messages={messages}
        msPerChar={30}
        pauseBetweenMessages={1400}
        resetKey={resetKey}
        loop={!intruderDetected}
        className={`block truncate font-mono text-xs tracking-wider sm:text-sm ${
          intruderDetected ? 'text-sentinel-red' : 'text-cyan-400'
        }`}
        cursorClassName={
          intruderDetected
            ? 'text-sentinel-red animate-pulse'
            : 'text-cyan-400 animate-pulse'
        }
      />
    </div>
  );
}
