import type {
  AriaItemDescriptor,
  ChartBootstrapOptions,
  ChartConfig,
  ChartDimensions,
  ChartEventTargetRegistration,
  ChartFeaturesConfig,
  ChartMargin,
  CsvExportOptions,
  CsvExportPayload,
  ResolvedSelectionConfig,
  SelectedChartItem,
  SelectionMode,
  ViewConfig
} from './types';
import type { ChartI18n } from './i18n';
import { loadChartStateView } from '../components/chart-state-loader';

export interface ZoomViewControllerLike {
  readonly hasInteraction: boolean;
  readonly zoomable: boolean;
  getTransform(): { k: number; x: number; y: number };
  scaleBy(factor: number): void;
  reset(): void;
  setZoomable(zoomable: boolean): void;
  destroy(): void;
  bindControls(): void;
  configure(
    svg: SVGSVGElement,
    viewportGroup: SVGGElement,
    viewConfig: ViewConfig,
    dims: ChartDimensions
  ): void;
}

export type ZoomControllerFactory = (
  host: HTMLElement,
  onZoomChange: (zoomed: boolean) => void,
  onToggleZoom?: () => void
) => ZoomViewControllerLike;

export interface CsvExporterImplementation {
  serialize: <
    TData = any,
    TRow extends Record<string, unknown> = Record<string, unknown>
  >(
    chartType: string,
    data: TData,
    options?: CsvExportOptions<TData, TRow>,
    config?: ChartConfig<TData>,
    i18n?: ChartI18n
  ) => CsvExportPayload<TData, TRow>;
  download: (csv: string, filename: string, mimeType?: string) => boolean;
}

export interface SelectableItemEntry {
  id: string;
  element: SVGElement;
  ariaItem?: AriaItemDescriptor;
  eventReg?: ChartEventTargetRegistration;
}

export interface SelectionHostAdapter {
  readonly host: HTMLElement;
  readonly chartType: string;
  readonly shadowRoot: ShadowRoot | null;
  readonly records: Map<string, SelectableItemEntry>;
  readonly margin: ChartMargin;
  selectedIds: string[];
  resolveConfig: () => ResolvedSelectionConfig;
  onSyncIds: (ids: string[]) => void;
}

export interface SelectionEngineImplementation {
  getSelectedItems: (adapter: SelectionHostAdapter) => SelectedChartItem[];
  finalizeRender: (adapter: SelectionHostAdapter) => boolean;
  mutate: (
    adapter: SelectionHostAdapter,
    kind: 'select' | 'deselect' | 'toggle' | 'set' | 'clear',
    ids?: string | string[],
    options?: {
      mode?: SelectionMode;
      silent?: boolean;
      source?: 'pointer' | 'keyboard' | 'api';
    }
  ) => SelectedChartItem[];
  handleClick: (
    adapter: SelectionHostAdapter,
    ev: {
      target: string;
      category: string;
      targetId?: string;
      element: Element;
      nativeEvent: Event;
      chartX: number;
      chartY: number;
      data?: Record<string, any>;
    },
    isKeyboard: boolean
  ) => void;
}

const activeFeatures: Required<ChartFeaturesConfig> = {
  zoom: false,
  csvExport: false,
  selection: false,
  chartState: true
};

let zoomControllerFactory: ZoomControllerFactory | null = null;
let csvExporterImpl: CsvExporterImplementation | null = null;
let selectionEngineImpl: SelectionEngineImplementation | null = null;
let chartStateLoad: Promise<void> | undefined;
const featureListeners = new Set<() => void>();

function notifyFeatureListeners(): void {
  for (const listener of [...featureListeners]) {
    listener();
  }
}

export function registerZoomControllerFactory(
  factory: ZoomControllerFactory
): void {
  zoomControllerFactory = factory;
}

export function createZoomController(
  host: HTMLElement,
  onZoomChange: (zoomed: boolean) => void,
  onToggleZoom?: () => void
): ZoomViewControllerLike | null {
  if (!activeFeatures.zoom || !zoomControllerFactory) return null;
  return zoomControllerFactory(host, onZoomChange, onToggleZoom);
}

export function registerCsvExporter(impl: CsvExporterImplementation): void {
  csvExporterImpl = impl;
}

export function getCsvExporter(): CsvExporterImplementation | null {
  if (!activeFeatures.csvExport || !csvExporterImpl) return null;
  return csvExporterImpl;
}

export function registerSelectionEngine(
  impl: SelectionEngineImplementation
): void {
  selectionEngineImpl = impl;
}

export function getSelectionEngine(): SelectionEngineImplementation | null {
  if (!activeFeatures.selection || !selectionEngineImpl) return null;
  return selectionEngineImpl;
}

export function isChartFeatureEnabled(
  feature: keyof ChartFeaturesConfig
): boolean {
  return Boolean(activeFeatures[feature]);
}

export function getChartFeatures(): Readonly<Required<ChartFeaturesConfig>> {
  return Object.freeze({ ...activeFeatures });
}

export function subscribeChartFeatures(listener: () => void): () => void {
  featureListeners.add(listener);
  return () => {
    featureListeners.delete(listener);
  };
}

function extractFeatureFlags(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): ChartFeaturesConfig {
  if (!options || typeof options !== 'object') return {};
  const asBootstrap = options as ChartBootstrapOptions;
  const nested = asBootstrap.features ?? {};
  const zoom = nested.zoom ?? (options as ChartFeaturesConfig).zoom;
  const csvExport =
    nested.csvExport ?? (options as ChartFeaturesConfig).csvExport;
  const selection =
    nested.selection ?? (options as ChartFeaturesConfig).selection;
  const chartState = nested.chartState ?? asBootstrap.chartState;
  return {
    ...(zoom !== undefined ? { zoom: Boolean(zoom) } : {}),
    ...(csvExport !== undefined ? { csvExport: Boolean(csvExport) } : {}),
    ...(selection !== undefined ? { selection: Boolean(selection) } : {}),
    ...(chartState !== undefined ? { chartState: Boolean(chartState) } : {})
  };
}

export function configureChartFeatures(
  options?: ChartBootstrapOptions | ChartFeaturesConfig
): Promise<void> {
  const flags = extractFeatureFlags(options);

  let changed = false;
  for (const key of ['zoom', 'csvExport', 'selection', 'chartState'] as const) {
    if (flags[key] !== undefined && activeFeatures[key] !== flags[key]) {
      activeFeatures[key] = flags[key]!;
      changed = true;
    }
  }

  const pendingLoads: Promise<unknown>[] = [];
  if (activeFeatures.zoom && !zoomControllerFactory) {
    pendingLoads.push(
      import('./chart-view-controller').then(notifyFeatureListeners)
    );
  }
  if (activeFeatures.csvExport && !csvExporterImpl) {
    pendingLoads.push(import('./csv-export').then(notifyFeatureListeners));
  }
  if (activeFeatures.selection && !selectionEngineImpl) {
    pendingLoads.push(
      import('./selection-engine').then(notifyFeatureListeners)
    );
  }
  if (activeFeatures.chartState && typeof document !== 'undefined') {
    chartStateLoad ??= loadChartStateView()
      ?.then(() => {
        if (activeFeatures.chartState) notifyFeatureListeners();
      })
      .finally(() => {
        chartStateLoad = undefined;
      });
    if (chartStateLoad) pendingLoads.push(chartStateLoad);
  }

  if (changed) notifyFeatureListeners();

  return pendingLoads.length > 0
    ? Promise.all(pendingLoads).then(() => undefined)
    : Promise.resolve();
}
