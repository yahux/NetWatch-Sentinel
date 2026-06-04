import type { ThreatLevelTier } from '../types/network';

export interface ThreatLevelGaugeState {
  tier: ThreatLevelTier;
  label: string;
  ratio: number;
  percent: number;
  position: number;
  intruderCount: number;
  trustedCount: number;
  isPanicMode: boolean;
}

const PANIC_THRESHOLD = 0.8;

export function computeThreatLevel(
  intruderCount: number,
  trustedCount: number
): ThreatLevelGaugeState {
  const total = intruderCount + trustedCount;

  if (intruderCount === 0) {
    return {
      tier: 'secure',
      label: 'Secure',
      ratio: 0,
      percent: 0,
      position: 8,
      intruderCount,
      trustedCount,
      isPanicMode: false,
    };
  }

  const ratio = total > 0 ? intruderCount / total : 1;
  const percent = Math.round(ratio * 100);
  const position = Math.min(96, Math.max(8, ratio * 100));
  const isPanicMode = ratio >= PANIC_THRESHOLD;

  if (ratio >= 0.25) {
    return {
      tier: 'critical',
      label: isPanicMode ? 'Panic' : 'Critical',
      ratio,
      percent,
      position,
      intruderCount,
      trustedCount,
      isPanicMode,
    };
  }

  return {
    tier: 'caution',
    label: 'Caution',
    ratio,
    percent,
    position,
    intruderCount,
    trustedCount,
    isPanicMode,
  };
}
