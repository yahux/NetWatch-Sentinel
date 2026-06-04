import type {
  ForensicSessionMeta,
  ForensicVideoFrame,
  GraphData,
  TelemetrySnapshot,
  TrafficLogEntry,
} from '../types/network';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sessionStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function exportThreatLogsJson(
  logs: TrafficLogEntry[],
  meta: ForensicSessionMeta
) {
  const payload = {
    exportedAt: new Date().toISOString(),
    session: meta,
    threatCount: logs.filter((l) => l.isThreat).length,
    totalEntries: logs.length,
    logs: logs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `netwatch-threats-${sessionStamp()}.json`);
}

export function exportThreatLogsText(
  logs: TrafficLogEntry[],
  meta: ForensicSessionMeta
) {
  const lines = [
    '# NetWatch Sentinel — Threat Session Log',
    `# Exported: ${new Date().toISOString()}`,
    `# Target: ${meta.targetIp || '—'} · Service: ${meta.serviceName || '—'}`,
    `# Monitoring: ${meta.monitoringMode}`,
    '',
    ...logs.map(
      (log) =>
        `[${log.timestamp.toISOString()}] ${log.status.toUpperCase()} ${log.sourceIp} -> ${log.destIp} (${log.protocol})${log.isThreat ? ' [THREAT]' : ''}${log.signatures?.length ? ` sig=${log.signatures.join(',')}` : ''}`
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  downloadBlob(blob, `netwatch-threats-${sessionStamp()}.log`);
}

export function exportTelemetryJson(telemetry: TelemetrySnapshot) {
  const blob = new Blob([JSON.stringify(telemetry, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `netwatch-telemetry-${sessionStamp()}.json`);
}

export function downloadGraphSnapshot(dataUrl: string, label = 'capture') {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `netwatch-map-${label}-${sessionStamp()}.png`;
  anchor.click();
}

export function createVideoExportFrame(
  graphData: GraphData,
  trigger: string
): ForensicVideoFrame {
  return {
    frameIndex: Date.now(),
    timestamp: new Date().toISOString(),
    trigger,
    nodeCount: graphData.nodes.length,
    linkCount: graphData.links.length,
    nodes: graphData.nodes.map((n) => ({
      id: n.id,
      ip: n.ip ?? n.label,
      nodeType: n.nodeType,
      x: n.x,
      y: n.y,
    })),
    links: graphData.links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : String(l.source),
      target: typeof l.target === 'string' ? l.target : String(l.target),
      isAttackLink: l.isAttackLink ?? false,
      trafficIntensity: l.trafficIntensity ?? 0,
    })),
  };
}

export function exportVideoExportManifest(
  frames: ForensicVideoFrame[],
  meta: ForensicSessionMeta
) {
  const manifest = {
    format: 'netwatch-ffmpeg-stub-v1',
    description:
      'Visual state timeline for offline FFmpeg assembly. Each frame records graph topology at a point in time.',
    exportedAt: new Date().toISOString(),
    session: meta,
    frameCount: frames.length,
    suggestedFps: 2,
    ffmpegHint:
      'Use accompanying PNG captures + this manifest to build an MP4 with a custom script.',
    frames,
  };

  const blob = new Blob([JSON.stringify(manifest, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `netwatch-video-manifest-${sessionStamp()}.json`);
}
