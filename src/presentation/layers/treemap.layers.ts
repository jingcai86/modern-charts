import { physicalTextAnchor } from '../../core/i18n';
import { formatGroupedNumber } from '../../core/format';
import { renderLegendLayer } from '../../core/scale-manager';
import type { ChartRenderContext, HierarchyNode } from '../../core/types';
import type { TreemapChartModel } from '../../models/treemap.model';
import { renderTreemapTileItem } from '../items/cell.item';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function renderTreemapTilesLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>,
  onDrilldown?: (pathNames: string[]) => void,
  onDrillUp?: () => void
): void {
  // 1. Breadcrumb bar when drilled down
  if (model.isDrilledDown && model.breadcrumbHeight > 0) {
    const bcG = document.createElementNS(SVG_NS, 'g');
    bcG.setAttribute('class', 'mc-treemap-breadcrumb');
    const bcRect = document.createElementNS(SVG_NS, 'rect');
    bcRect.setAttribute('x', '2');
    bcRect.setAttribute('y', '0');
    bcRect.setAttribute('width', String(Math.max(40, ctx.innerWidth - 4)));
    bcRect.setAttribute('height', String(model.breadcrumbHeight - 4));
    bcRect.setAttribute('rx', '6');
    bcRect.setAttribute(
      'fill',
      ctx.theme.mode === 'dark' ? '#1e293b' : '#f1f5f9'
    );
    bcRect.setAttribute('stroke', ctx.theme.axisColor);
    bcRect.setAttribute('stroke-width', '1');
    if (ctx.isInteractive !== false && onDrillUp) {
      bcG.style.cursor = 'pointer';
      bcG.addEventListener('click', onDrillUp);
    }
    bcG.appendChild(bcRect);

    ctx.renderLabel(bcG, {
      id: 'treemap-breadcrumb-label',
      text: `↩ ${model.breadcrumbText}`,
      x: 12,
      y: (model.breadcrumbHeight - 4) / 2,
      type: 'title',
      anchor: physicalTextAnchor('start', ctx.i18n.direction),
      baseline: 'middle',
      maxWidth: Math.max(80, ctx.innerWidth - 28),
      fontSize: Math.max(11, ctx.theme.fontSize - 1),
      fontWeight: 700,
      color: ctx.theme.textColor,
      datum: { name: model.activeRootName }
    });

    ctx.layerGroup.appendChild(bcG);
  }

  // 2. Parent group container boxes (when leavesOnly is false)
  model.parents.forEach((parent) => {
    if (parent.width <= 2 || parent.height <= 2) return;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'mc-treemap-parent');
    rect.setAttribute('data-parent-name', parent.name);
    rect.setAttribute('x', String(parent.x0));
    rect.setAttribute('y', String(parent.y0));
    rect.setAttribute('width', String(parent.width));
    rect.setAttribute('height', String(parent.height));
    rect.setAttribute('rx', String(parent.rx));
    rect.setAttribute('fill', parent.color);
    rect.setAttribute('fill-opacity', '0.14');
    rect.setAttribute('stroke', parent.color);
    rect.setAttribute('stroke-opacity', '0.45');
    rect.setAttribute('stroke-width', '1.25');
    if (
      ctx.isInteractive !== false &&
      model.interactiveDrilldown &&
      onDrilldown
    ) {
      rect.style.cursor = 'pointer';
      rect.addEventListener('click', () => {
        if (ctx.isSelectionEnabled) return;
        ctx.hideTooltip();
        onDrilldown(parent.pathNames);
      });
    }
    ctx.layerGroup.appendChild(rect);
  });

  // 3. Leaf tiles
  model.leaves.forEach((leaf) => {
    if (leaf.width <= 1 || leaf.height <= 1) return;
    ctx.layerGroup.appendChild(
      renderTreemapTileItem(
        leaf,
        ctx,
        model.interactiveDrilldown,
        onDrilldown
      )
    );
  });
}

export function renderTreemapLabelsLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  if (!model.enableLabels) return;

  // 1. Parent header labels
  if (!model.leavesOnly && model.parents.length > 0) {
    model.parents.forEach((parent, idx) => {
      if (parent.width < 44 || parent.headerHeight < 14) return;
      ctx.renderLabel(ctx.layerGroup, {
        id: `treemap-parent-label-${idx}`,
        text: `${parent.name} (${formatGroupedNumber(parent.value, ctx.i18n)})`,
        x: parent.x0 + 8,
        y: parent.y0 + parent.headerHeight / 2,
        type: 'title',
        anchor: physicalTextAnchor('start', ctx.i18n.direction),
        baseline: 'middle',
        maxWidth: Math.max(32, parent.width - 16),
        maxHeight: Math.max(12, parent.headerHeight - 2),
        fontSize: Math.max(10, ctx.theme.fontSize - 1),
        fontWeight: 700,
        color: ctx.theme.textColor,
        datum: {
          id: parent.name,
          name: parent.name,
          value: parent.value
        }
      });
    });
  }

  // 2. Leaf tile labels (supports orientLabel -90° vertical rotation for narrow tiles)
  model.leaves.forEach((leaf, idx) => {
    const isVertical = (leaf.labelRotation ?? 0) !== 0;
    const majorSpan = isVertical ? leaf.height : leaf.width;
    const minorSpan = isVertical ? leaf.width : leaf.height;
    if (majorSpan < 34 || minorSpan < 18) return;

    const text =
      minorSpan >= 42 ? `${leaf.name} (${leaf.value})` : leaf.name;
    ctx.renderLabel(ctx.layerGroup, {
      id: `treemap-label-${idx}`,
      text,
      x: leaf.x0 + leaf.width / 2,
      y: leaf.y0 + leaf.height / 2,
      type: 'cell',
      anchor: 'middle',
      baseline: 'middle',
      rotation: leaf.labelRotation ?? 0,
      maxWidth: Math.max(24, majorSpan - 10),
      maxHeight: Math.max(14, minorSpan - 6),
      fontSize: Math.max(10, ctx.theme.fontSize - 1),
      fontWeight: 600,
      color: '#ffffff',
      datum: {
        id: leaf.name,
        name: leaf.name,
        category: leaf.category,
        value: leaf.value
      }
    });
  });
}

export function renderTreemapLegendsLayer(
  model: TreemapChartModel,
  ctx: ChartRenderContext<HierarchyNode>
): void {
  renderLegendLayer(ctx, model.categories, 'bottom');
}
