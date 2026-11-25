import type { LabelOverflowStrategy, LabelTruncateResult } from './types';

export function rotatesOnOverflow(strategy: LabelOverflowStrategy): boolean {
  return strategy === 'rotate' || strategy === 'both' || strategy === 'rotate-wrap-truncate';
}

export function needsFullTextTooltip(
  result: Pick<LabelTruncateResult, 'truncated' | 'overflowTriggered' | 'appliedRotation' | 'appliedStrategy'>
): boolean {
  return result.truncated || (
    result.overflowTriggered && result.appliedRotation !== 0 && rotatesOnOverflow(result.appliedStrategy)
  );
}
