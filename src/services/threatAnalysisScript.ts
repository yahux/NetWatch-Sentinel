import type { IntruderAlert } from '../types/network';

const CVE_POOL = [
  'CVE-2026-9921',
  'CVE-2026-4412',
  'CVE-2025-8890',
  'CVE-2026-1104',
];

export function buildThreatAnalysisScript(alert?: IntruderAlert | null): string[] {
  const cve = CVE_POOL[Math.floor(Math.random() * CVE_POOL.length)];
  const source = alert?.sourceIp ?? 'unknown-host';
  const dest = alert?.destIp ?? 'internal-segment';
  const sig = alert?.signatures?.[0] ?? 'anomaly_detected';

  return [
    '[ANALYSIS] Detecting anomalous traffic pattern…',
    `[SCAN] Source ${source} → ${dest}`,
    `[MATCH] ${cve} · lateral movement signature`,
    `[CORRELATE] Trigger: ${sig.replace(/_/g, ' ')}`,
    '[ACTION] Isolating affected endpoint…',
    '[ACTION] Deploying quarantine rules to edge firewall…',
    '[STATUS] Threat containment in progress…',
  ];
}
