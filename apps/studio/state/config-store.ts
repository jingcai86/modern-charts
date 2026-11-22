import type {
  ChartConfig,
  MarkerLabelPosition,
  MarkerMatchScope,
  ThemeModePreference
} from '../../../src/index';
import { SVG_ICON_PRESETS, type ChartCatalogEntry } from '../catalog';
import { getGlobalThemeMode } from './theme';

export interface ChartVirtualState {
  __markerEnabled: boolean;
  __markerThresholdValue: number;
  __markerCondition: 'below' | 'above' | 'between';
  __markerMatchScope: MarkerMatchScope;
  __markerMatchColor: string;
  __markerLabelPosition: MarkerLabelPosition;
  __markerLabelPadding: number;
  __markerLabelEdgePadding: number;
  __labelIconPreset: string;
}

// Per-chart active config state so user customizations persist across route changes
const chartConfigState = new Map<string, ChartConfig<any>>();
const chartVirtualState = new Map<string, ChartVirtualState>();

export function getOrInitChartConfig(entry: ChartCatalogEntry): ChartConfig<any> {
  if (!chartConfigState.has(entry.id)) {
    const cfg = entry.createDefaultConfig(getGlobalThemeMode());
    chartConfigState.set(entry.id, cfg);

    const lineMarker = cfg.markers?.find((m) => m.type === 'line');
    chartVirtualState.set(entry.id, {
      __markerEnabled: Boolean(cfg.markers && cfg.markers.length > 0),
      __markerThresholdValue:
        typeof lineMarker?.value === 'number' ? lineMarker.value : 130,
      __markerCondition:
        (lineMarker?.condition as 'below' | 'above' | 'between') ?? 'below',
      __markerMatchScope: lineMarker?.matchScope ?? 'partial',
      __markerMatchColor: lineMarker?.matchStyle?.color ?? '#ef4444',
      __markerLabelPosition: lineMarker?.labelPosition ?? 'top-right',
      __markerLabelPadding: lineMarker?.labelPadding ?? 10,
      __markerLabelEdgePadding: lineMarker?.labelEdgePadding ?? 10,
      __labelIconPreset: 'none'
    });
  }
  return chartConfigState.get(entry.id)!;
}

export function getChartVirtualState(entryId: string): ChartVirtualState {
  return chartVirtualState.get(entryId)!;
}

export function setStoredChartConfig(
  entryId: string,
  config: ChartConfig<any>
): void {
  chartConfigState.set(entryId, config);
}

export function resetChartConfig(entry: ChartCatalogEntry): ChartConfig<any> {
  chartConfigState.delete(entry.id);
  chartVirtualState.delete(entry.id);
  return getOrInitChartConfig(entry);
}

export function syncAllStoredConfigsTheme(pref: ThemeModePreference): void {
  chartConfigState.forEach((cfg) => {
    cfg.themeMode = pref;
    if (cfg.theme) {
      delete cfg.theme.background;
      delete cfg.theme.textColor;
      delete cfg.theme.axisColor;
      delete cfg.theme.gridColor;
    }
  });
}

export function buildMarkersForVirtualState(
  entry: ChartCatalogEntry,
  vState: ChartVirtualState
) {
  if (!entry.supportsMarkers || !vState.__markerEnabled) {
    return [];
  }
  const val = Number(vState.__markerThresholdValue) || 130;
  const color = vState.__markerMatchColor || '#ef4444';
  const cond = vState.__markerCondition || 'below';
  const matchScope = vState.__markerMatchScope || 'partial';
  const labelPosition = vState.__markerLabelPosition || 'top-right';
  const labelPadding = Number(vState.__markerLabelPadding ?? 10);
  const labelEdgePadding = Number(vState.__markerLabelEdgePadding ?? 10);

  return [
    {
      id: `${entry.id}-threshold-area`,
      type: 'area' as const,
      axis: 'y' as const,
      from: 0,
      to: val,
      fill: color,
      fillOpacity: 0.09
    },
    {
      id: `${entry.id}-threshold-line`,
      type: 'line' as const,
      axis: 'y' as const,
      value: val,
      from: cond === 'between' ? 0 : undefined,
      to: cond === 'between' ? val : undefined,
      label: `Threshold (${cond} ${val})`,
      labelPosition,
      labelPadding,
      labelEdgePadding,
      icon: SVG_ICON_PRESETS.warn,
      stroke: color,
      strokeWidth: 2,
      strokeDasharray: '6 4',
      condition: cond,
      matchScope,
      matchStyle: {
        color,
        fill: color,
        stroke: color,
        radius: 6
      }
    }
  ];
}
