import type { LabelOverflowStrategy } from '../../../src/index';
import { rotatesOnOverflow } from '../../../src/core/label-overflow';

export const LABEL_OVERFLOW_MODES: readonly {
  strategy: LabelOverflowStrategy;
  label: string;
}[] = [
  { strategy: 'truncate', label: 'Truncate' },
  { strategy: 'rotate', label: 'Rotate' },
  { strategy: 'both', label: 'Rotate + truncate' },
  { strategy: 'wrap', label: 'Wrap' },
  { strategy: 'wrap-truncate', label: 'Wrap + truncate' },
  { strategy: 'rotate-wrap-truncate', label: 'Rotate + wrap + truncate' },
  { strategy: 'none', label: 'None' }
];

export function getLabelOverflowCapabilities(strategy: LabelOverflowStrategy) {
  const capsWrappedLines = strategy === 'wrap-truncate' || strategy === 'rotate-wrap-truncate';
  const truncates = strategy === 'truncate' || strategy === 'both' || capsWrappedLines;
  const rotates = rotatesOnOverflow(strategy);
  return {
    maxWidth: strategy !== 'none',
    maxChars: truncates || rotates,
    maxLines: capsWrappedLines,
    maxRotation: rotates,
    ellipsis: truncates,
    enableTooltip: truncates || rotates
  };
}
