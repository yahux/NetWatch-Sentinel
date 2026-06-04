interface ForensicRecorderProps {
  isRecording: boolean;
  sessionThreatCount: number;
  videoFrameCount: number;
  onToggleRecord: () => void;
  onExportLogs: () => void;
  onSnapshot: () => void;
  onPrepareVideoExport: () => void;
}

export default function ForensicRecorder({
  isRecording,
  sessionThreatCount,
  videoFrameCount,
  onToggleRecord,
  onExportLogs,
  onSnapshot,
  onPrepareVideoExport,
}: ForensicRecorderProps) {
  return (
    <div className="hud-panel pointer-events-auto w-full max-w-xs rounded-lg p-3 sm:max-w-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-[10px] font-bold uppercase tracking-widest text-sentinel-cyan">
            Forensic Recorder
          </h3>
          <p className="hud-label mt-0.5">Session capture & export</p>
        </div>
        <button
          type="button"
          onClick={onToggleRecord}
          className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
            isRecording
              ? 'border-sentinel-red/50 bg-sentinel-red/15 text-sentinel-red'
              : 'border-white/10 bg-gray-950/50 text-gray-400 hover:border-sentinel-cyan/40 hover:text-sentinel-cyan'
          }`}
        >
          {isRecording ? '● Recording' : '○ Record Session'}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[9px] text-gray-500">
        <span>Threats: {sessionThreatCount}</span>
        <span>Frames: {videoFrameCount}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onExportLogs}
          className="rounded border border-white/10 bg-gray-950/50 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-gray-300 transition-colors hover:border-sentinel-cyan/40 hover:text-sentinel-cyan"
        >
          Export Logs
        </button>
        <button
          type="button"
          onClick={onSnapshot}
          className="rounded border border-white/10 bg-gray-950/50 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-gray-300 transition-colors hover:border-sentinel-green/40 hover:text-sentinel-green"
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={onPrepareVideoExport}
          title="Exports a frame manifest for offline FFmpeg assembly (stub)"
          className="col-span-2 rounded border border-dashed border-white/15 bg-gray-950/30 px-2 py-1.5 font-mono text-[9px] uppercase tracking-wider text-gray-400 transition-colors hover:border-yellow-500/40 hover:text-yellow-400"
        >
          Prepare for Video Export
        </button>
      </div>

      <p className="mt-2 font-mono text-[8px] leading-relaxed text-gray-600">
        Export Logs downloads full telemetry JSON. Snapshot saves a 2× PNG of the
        live graph canvas.
      </p>
    </div>
  );
}
