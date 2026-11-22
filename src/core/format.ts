const GROUPED_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 20
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit'
});

const SI_SUFFIXES: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k']
];

/**
 * Formats a number with thousands grouping separators (equivalent to `d3.format(',')`).
 */
export function formatGroupedNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return GROUPED_NUMBER_FORMATTER.format(value);
}

/**
 * Formats an axis tick number cleanly using SI prefixes for round thousands
 * and trimmed decimals for fractional values (replaces `d3.format('~s')` / `d3.format('.2~f')`).
 */
export function formatAxisNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1000 && value % 1000 === 0) {
    for (const [threshold, suffix] of SI_SUFFIXES) {
      if (abs >= threshold) {
        const scaled = Number((value / threshold).toFixed(2));
        return `${scaled === 0 ? 0 : scaled}${suffix}`;
      }
    }
  }
  if (Number.isInteger(value)) {
    return value === 0 ? '0' : String(value);
  }
  const rounded = Number(value.toFixed(2));
  return rounded === 0 ? '0' : String(rounded);
}

/**
 * Formats a Date as `"MMM DD"` (equivalent to `d3.timeFormat('%b %d')`).
 */
export function formatAxisDate(value: Date): string {
  if (Number.isNaN(value.getTime())) return '';
  return SHORT_DATE_FORMATTER.format(value);
}
