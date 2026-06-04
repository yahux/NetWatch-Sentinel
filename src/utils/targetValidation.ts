const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;

const HOSTNAME =
  /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export function isValidTargetAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (IPV4.test(trimmed)) return true;
  if (trimmed.toLowerCase() === 'localhost') return true;
  return HOSTNAME.test(trimmed);
}
