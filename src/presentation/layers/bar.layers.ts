import { renderLegendLayer } from '../../core/scale-manager';
import type { BarDatum, ChartRenderContext } from '../../core/types';
import type { BarChartModel } from '../../models/bar.model';
import { renderBarItem } from '../items/bar.item';

/**
 * Dumb Presentation Layer for Bar Items (`bars` layer).
 */
export function renderBarsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  model.bars.forEach((barModel) => {
    const rect = renderBarItem(barModel, ctx);
    ctx.layerGroup.appendChild(rect);
  });
}

/**
 * Dumb Presentation Layer for Bar Data Labels (`labels` layer).
 */
export function renderBarLabelsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  if (!model.enableLabels) return;

  model.bars.forEach((b, idx) => {
    const text = String(b.value);
    const measured = ctx.measureText(text, {
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      icon: b.threshold.style.icon
    });

    const fitsInside =
      b.height >= measured.boxHeight + 6 && b.width >= measured.boxWidth + 6;
    const labelX = b.x + b.width / 2;
    const labelY = fitsInside ? b.y + b.height / 2 : Math.max(10, b.y - 10);

    ctx.renderLabel(ctx.layerGroup, {
      id: `bar-label-${idx}`,
      text,
      x: labelX,
      y: labelY,
      type: 'data',
      anchor: 'middle',
      baseline: 'middle',
      maxWidth: Math.max(36, b.width + 12),
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color:
        b.threshold.style.labelColor ??
        (fitsInside ? '#ffffff' : ctx.theme.textColor),
      icon: b.threshold.style.icon,
      datum: {
        id: b.key,
        category: b.indexValue,
        value: b.value,
        isUnderThreshold: b.threshold.isUnderThreshold,
        ...b.datum
      }
    });
  });
}

/**
 * Dumb Presentation Layer for Bar Legends (`legends` layer).
 */
export function renderBarLegendsLayer(
  model: BarChartModel,
  ctx: ChartRenderContext<BarDatum[]>
): void {
  renderLegendLayer(
    ctx,
    model.activeKeys.map((k) => ({
      id: k,
      label: k,
      color: ctx.colorScale(k)
    })),
    'right'
  );
}
