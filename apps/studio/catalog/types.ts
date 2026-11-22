import type { ChartConfig, ThemeModePreference } from '../../../src/index';

export type AttributeControlType =
  | 'boolean'
  | 'number'
  | 'range'
  | 'select'
  | 'text'
  | 'color';

export interface ChartAttributeSpec {
  /** Path in `chart.config` (e.g. 'enableArea', 'yScale.max', 'view.zoomable') */
  configPath: string;
  /** HTML attribute equivalent on the Web Component or layer tag */
  attrName: string;
  /** Group category shown in the attributes table */
  category:
    | 'Chart-Specific'
    | 'Theme Layer (<mc-theme-layer>)'
    | 'Scale Layer (<mc-scale-layer>)'
    | 'View & Zoom (<mc-view-layer>)'
    | 'Animation (<mc-animation-layer>)'
    | 'Marker & Threshold (<mc-marker-layer>)'
    | 'Legend (<mc-legend>)'
    | 'Universal Label (<mc-label>)'
    | 'Accessibility (<mc-aria-layer>)'
    | 'Sizing & Layout';
  control: AttributeControlType;
  description: string;
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string }[];
}

export interface ChartCatalogEntry {
  id: string;
  title: string;
  tagName: string;
  summary: string;
  subComponents: string[];
  defaultLayers: string[];
  supportsMarkers: boolean;
  supportsCartesianScales: boolean;
  supportsViewZoom: boolean;
  createDefaultConfig: (themeMode: ThemeModePreference) => ChartConfig<any>;
  specificAttributes: ChartAttributeSpec[];
}
