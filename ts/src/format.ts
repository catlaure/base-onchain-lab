/** 0x1234…abcd */
export function shortAddress(address: string, chars = 4): string {
  if (address.length <= 2 + chars * 2) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

/**
 * Formats a raw token amount for display.
 * Trims trailing zeros and caps the fractional part at `maxFractionDigits` (truncating, not rounding).
 */
export function formatAmount(value: bigint, decimals: number, maxFractionDigits = 6): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  let fraction = (abs % base).toString().padStart(decimals, "0");

  fraction = fraction.slice(0, maxFractionDigits).replace(/0+$/, "");
  const text = fraction ? `${whole}.${fraction}` : `${whole}`;
  return negative ? `-${text}` : text;
}

const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
};

/** Parses "90s", "15m", "12h", "30d" or "2w" into seconds. A bare number is treated as seconds. */
export function parseDuration(input: string): number {
  const match = /^(\d+)([smhdw]?)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration "${input}" (use e.g. 90s, 15m, 12h, 30d, 2w)`);
  const [, amount, unit] = match;
  return Number(amount) * UNITS[unit || "s"]!;
}
