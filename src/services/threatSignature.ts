import type { TrafficPacket } from '../types/network';

const SUSPICIOUS_PORTS = new Set([
  22, 23, 135, 445, 1433, 3389, 4444, 5555, 6666, 6667, 8080,
]);

function isPrivateIp(ip: string): boolean {
  const trimmed = ip.trim().toLowerCase();
  if (trimmed === 'localhost' || trimmed === '127.0.0.1' || trimmed === '::1') {
    return true;
  }
  const parts = trimmed.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export interface ThreatSignatureResult {
  matches: boolean;
  signatures: string[];
}

export function evaluateThreatSignature(
  packet: TrafficPacket
): ThreatSignatureResult {
  const signatures: string[] = [];

  if (packet.isThreat) signatures.push('flagged_threat');
  if (packet.status === 'threat') signatures.push('threat_status');
  if (packet.status === 'blocked') signatures.push('blocked_connection');
  if ((packet.threatLevel ?? 0) >= 7) signatures.push('high_threat_level');

  if (packet.sourcePort != null && SUSPICIOUS_PORTS.has(packet.sourcePort)) {
    signatures.push(`unexpected_source_port:${packet.sourcePort}`);
  }
  if (packet.destPort != null && SUSPICIOUS_PORTS.has(packet.destPort)) {
    signatures.push(`unexpected_dest_port:${packet.destPort}`);
  }

  if (
    isPrivateIp(packet.destIp) &&
    !isPrivateIp(packet.sourceIp) &&
    packet.sourceIp !== '127.0.0.1'
  ) {
    signatures.push('unauthorized_external_access');
  }

  return { matches: signatures.length > 0, signatures };
}
