import type { MCChartLayer, MCCustomLayer } from '../components/layers/mc-layers';
import type { ChartRenderContext, LayerInput, MarkerConfig } from './types';

export interface ResolvedChartLayer<TData> {
  name: string;
  input: LayerInput<TData>;
  render: (ctx: ChartRenderContext<TData>) => void;
  builtIn?: true;
}

interface LayerChart<TData> {
  readonly children: HTMLCollection;
  readonly layers: LayerInput<TData>[];
  resolveMarkersConfig(): MarkerConfig[];
}

/** Combines built-ins and custom layers in their final render order. */
export function resolveChartLayers<TData>(
  chart: LayerChart<TData>,
  builtInRenderers: Record<string, ResolvedChartLayer<TData>['render']>,
  hasExplicitLayers: boolean
): ResolvedChartLayer<TData>[] {
  const sequence: ResolvedChartLayer<TData>[] = [];

  const directLayerChildren = Array.from(chart.children).filter((el) => {
    const t = el.tagName.toLowerCase();
    return t === 'mc-chart-layer' || t === 'mc-custom-layer';
  });

  const hasDeclarativeChartLayers = directLayerChildren.some(
    (el) => el.tagName.toLowerCase() === 'mc-chart-layer'
  );

  if (
    hasDeclarativeChartLayers &&
    !hasExplicitLayers
  ) {
    for (const el of directLayerChildren) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'mc-chart-layer') {
        const chartLayer = el as MCChartLayer;
        const name = chartLayer.layerName || el.getAttribute('name') || '';
        const enabled =
          !el.hasAttribute('enabled') ||
          el.getAttribute('enabled') !== 'false';
        if (enabled && name && builtInRenderers[name]) {
          sequence.push({
            name,
            input: name,
            builtIn: true,
            render: builtInRenderers[name]
          });
        }
      } else if (tag === 'mc-custom-layer') {
        const customEl = el as MCCustomLayer;
        const name =
          customEl.layerName || el.getAttribute('name') || 'custom-layer';
        const enabled =
          !el.hasAttribute('enabled') ||
          el.getAttribute('enabled') !== 'false';
        if (enabled) {
          sequence.push({
            name,
            input: name,
            render: (ctx) => customEl.renderIntoContext(ctx)
          });
        }
      }
    }
    return sequence;
  }

  const rawLayers = chart.layers;
  rawLayers.forEach((item, idx) => {
    if (typeof item === 'string') {
      if (builtInRenderers[item]) {
        sequence.push({
          name: item,
          input: item,
          builtIn: true,
          render: builtInRenderers[item]
        });
      } else {
        const matchingCustomEl = directLayerChildren.find(
          (el) =>
            el.tagName.toLowerCase() === 'mc-custom-layer' &&
            el.getAttribute('name') === item
        ) as MCCustomLayer | undefined;
        if (matchingCustomEl) {
          sequence.push({
            name: item,
            input: item,
            render: (ctx) => matchingCustomEl.renderIntoContext(ctx)
          });
        }
      }
    } else if (typeof item === 'function') {
      const fnName = item.name || `custom-fn-${idx}`;
      sequence.push({
        name: fnName,
        input: item,
        render: (ctx) => {
          const res = item(ctx);
          if (typeof res === 'string') {
            ctx.layerGroup.innerHTML = res;
          } else if (res instanceof SVGElement) {
            ctx.layerGroup.appendChild(res);
          }
        }
      });
    } else if (item && typeof item === 'object' && 'render' in item) {
      sequence.push({
        name: item.name || `custom-obj-${idx}`,
        input: item,
        render: (ctx) => {
          const res = item.render(ctx);
          if (typeof res === 'string') {
            ctx.layerGroup.innerHTML = res;
          } else if (res instanceof SVGElement) {
            ctx.layerGroup.appendChild(res);
          }
        }
      });
    }
  });

  for (const el of directLayerChildren) {
    if (el.tagName.toLowerCase() !== 'mc-custom-layer') continue;
    const customEl = el as MCCustomLayer;
    const name =
      customEl.layerName || el.getAttribute('name') || 'custom-layer';
    if (sequence.some((s) => s.name === name)) continue;
    const enabled =
      !el.hasAttribute('enabled') || el.getAttribute('enabled') !== 'false';
    if (!enabled) continue;

    const orderAttr = el.getAttribute('order');
    const entry = {
      name,
      input: name,
      render: (ctx: ChartRenderContext<TData>) =>
        customEl.renderIntoContext(ctx)
    };

    if (orderAttr?.startsWith('before:')) {
      const target = orderAttr.slice('before:'.length);
      const targetIdx = sequence.findIndex((s) => s.name === target);
      if (targetIdx >= 0) {
        sequence.splice(targetIdx, 0, entry);
        continue;
      }
    } else if (orderAttr?.startsWith('after:')) {
      const target = orderAttr.slice('after:'.length);
      const targetIdx = sequence.findIndex((s) => s.name === target);
      if (targetIdx >= 0) {
        sequence.splice(targetIdx + 1, 0, entry);
        continue;
      }
    }
    sequence.push(entry);
  }

  if (
    chart.resolveMarkersConfig().length > 0 &&
    !sequence.some((s) => s.name === 'markers') &&
    !hasExplicitLayers
  ) {
    const markerEntry = {
      name: 'markers',
      input: 'markers' as LayerInput<TData>,
      render: builtInRenderers.markers
    };
    const labelIdx = sequence.findIndex(
      (s) => s.name === 'labels' || s.name === 'legends'
    );
    if (labelIdx >= 0) {
      sequence.splice(labelIdx, 0, markerEntry);
    } else {
      sequence.push(markerEntry);
    }
  }

  return sequence;
}
