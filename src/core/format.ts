import { createChartI18n, type ChartI18n } from './i18n';

const SI_SUFFIXES: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'T'],
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k']
];

/** Formats a number with locale-aware thousands grouping separators. */
export function formatGroupedNumber(value: number, i18n: ChartI18n = createChartI18n()): string {
  if (!Number.isFinite(value)) return String(value);
  return i18n.formatNumber(value, { maximumFractionDigits: 20 });
}

/** Formats numeric axis ticks with SI prefixes and up to two decimal places. */
export function formatAxisNumber(value: number, i18n: ChartI18n = createChartI18n()): string {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if (abs >= 1000 && value % 1000 === 0) {
    for (const [threshold, suffix] of SI_SUFFIXES) {
      if (abs >= threshold) {
        const scaled = Number((value / threshold).toFixed(2));
        return `${i18n.formatNumber(scaled === 0 ? 0 : scaled, { useGrouping: false })}${suffix}`;
      }
    }
  }
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return i18n.formatNumber(rounded === 0 ? 0 : rounded, { useGrouping: false });
}

/** Formats a short month/day axis tick in the configured locale and time zone. */
export function formatAxisDate(value: Date, i18n: ChartI18n = createChartI18n()): string {
  if (Number.isNaN(value.getTime())) return '';
  return i18n.formatDate(value, { month: 'short', day: '2-digit' });
}

/** Formats display text while leaving raw datum values and identifiers unchanged. */
export function formatDisplayValue(value: unknown, i18n: ChartI18n = createChartI18n()): string {
  if (value instanceof Date) return formatAxisDate(value, i18n);
  if (typeof value === 'number') return i18n.formatNumber(value, { useGrouping: false });
  return value == null ? '' : String(value);
}
